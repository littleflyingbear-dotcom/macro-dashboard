#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch daily macro dashboard data.

Data source:
- Yahoo Finance chart API, no API key required.
- Symbols:
  CNY=X      USD/CNY
  AUDCNY=X   AUD/CNY
  EURCNY=X   EUR/CNY
  JPYCNY=X   JPY/CNY, multiplied by 100
  XAUUSD=X   spot gold, fallback to GC=F if unavailable

Shanghai gold:
- V1 uses estimated RMB gold price:
  XAU/USD * USD/CNY / 31.1034768
  Unit: CNY per gram.
This is not the Shanghai Gold Exchange official quote; it is a practical domestic price proxy.
"""

import json
import math
import pathlib
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "latest.json"

SYMBOLS = {
    "USDCNY": {"name": "美元兑人民币", "symbol": "USD/CNY", "yahoo": "CNY=X", "digits": 4, "multiplier": 1},
    "AUDCNY": {"name": "澳元兑人民币", "symbol": "AUD/CNY", "yahoo": "AUDCNY=X", "digits": 4, "multiplier": 1},
    "EURCNY": {"name": "欧元兑人民币", "symbol": "EUR/CNY", "yahoo": "EURCNY=X", "digits": 4, "multiplier": 1},
    "JPYCNY100": {"name": "100日元兑人民币", "symbol": "100JPY/CNY", "yahoo": "JPYCNY=X", "digits": 4, "multiplier": 100},
    "XAUUSD": {"name": "国际金价", "symbol": "XAU/USD", "yahoo": "XAUUSD=X", "digits": 2, "multiplier": 1},
}

def yahoo_chart(symbol: str, days: int = 45):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol)}?range={days}d&interval=1d"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    result = data["chart"]["result"][0]
    timestamps = result["timestamp"]
    closes = result["indicators"]["quote"][0]["close"]
    rows = []
    for ts, close in zip(timestamps, closes):
        if close is None or not math.isfinite(close):
            continue
        date = datetime.fromtimestamp(ts, timezone.utc).strftime("%m-%d")
        rows.append((date, float(close)))
    return rows

def pct(last, prev):
    if prev == 0:
        return 0
    return round((last / prev - 1) * 100, 3)

def main():
    series = {}
    errors = []

    for key, meta in SYMBOLS.items():
        try:
            rows = yahoo_chart(meta["yahoo"])
            rows = [(d, v * meta.get("multiplier", 1)) for d, v in rows]
            series[key] = rows[-30:]
        except Exception as e:
            errors.append(f"{key}: {e}")

    # Fallback for gold if XAUUSD=X is unavailable
    if "XAUUSD" not in series:
        try:
            rows = yahoo_chart("GC=F")
            series["XAUUSD"] = rows[-30:]
        except Exception as e:
            errors.append(f"GC=F fallback: {e}")

    if not series:
        raise RuntimeError("No data fetched. Errors: " + "; ".join(errors))

    # Align dates by USD/CNY dates when possible
    base_dates = [d for d, _ in series.get("USDCNY", next(iter(series.values())))]
    history = []
    lookup = {k: dict(v) for k, v in series.items()}

    for d in base_dates:
        row = {"date": d}
        for key in SYMBOLS.keys():
            if key in lookup and d in lookup[key]:
                row[key] = round(lookup[key][d], SYMBOLS[key]["digits"])
            else:
                row[key] = None

        # Estimated RMB gold price per gram
        if row.get("XAUUSD") is not None and row.get("USDCNY") is not None:
            row["XAUCNYG"] = round(row["XAUUSD"] * row["USDCNY"] / 31.1034768, 2)
        else:
            row["XAUCNYG"] = None
        history.append(row)

    # Remove rows with too many missing values
    history = [r for r in history if sum(v is not None for k, v in r.items() if k != "date") >= 3]
    latest = history[-1]
    prev = history[-2] if len(history) >= 2 else history[-1]

    assets = []
    for key, meta in SYMBOLS.items():
        if latest.get(key) is None:
            continue
        assets.append({
            "key": key,
            "name": meta["name"],
            "symbol": meta["symbol"],
            "value": latest[key],
            "change_pct": pct(latest[key], prev.get(key) or latest[key]),
            "digits": meta["digits"],
        })

    if latest.get("XAUCNYG") is not None:
        assets.append({
            "key": "XAUCNYG",
            "name": "人民币金价估算",
            "symbol": "CNY/克",
            "value": latest["XAUCNYG"],
            "change_pct": pct(latest["XAUCNYG"], prev.get("XAUCNYG") or latest["XAUCNYG"]),
            "digits": 2,
        })

    output = {
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source_note": "FX and gold from Yahoo Finance chart API. RMB gold price is estimated from XAU/USD and USD/CNY.",
        "errors": errors,
        "assets": assets,
        "history": history[-30:],
    }

    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")
    if errors:
        print("Warnings:")
        for e in errors:
            print("-", e)

if __name__ == "__main__":
    main()
