let rawData = null;
let chart = null;

const formatNumber = (value, digits=4) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
};

const formatChange = (pct) => {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
};

const changeClass = (pct) => {
  if (pct === null || pct === undefined || Math.abs(pct) < 0.03) return "flat";
  return pct > 0 ? "up" : "down";
};

const arrow = (pct) => {
  if (pct === null || pct === undefined || Math.abs(pct) < 0.03) return "→";
  return pct > 0 ? "↑" : "↓";
};

function cardNote(item){
  if (item.key === "USDCNY") return "中国经济预期与资本流向核心指标。";
  if (item.key === "AUDCNY") return "中国经济与大宗商品的高 Beta 观察项。";
  if (item.key === "EURCNY") return "欧洲资产配置与欧元区风险偏好。";
  if (item.key === "JPYCNY100") return "日本旅游、购物、日元换汇窗口。";
  if (item.key === "XAUUSD") return "全球避险、美元信用与央行买金。";
  if (item.key === "XAUCNYG") return "人民币计价黄金，贴近国内持有体验。";
  return "";
}

function renderCards(){
  const container = document.getElementById("cards");
  const items = rawData.assets;
  container.innerHTML = items.map(item => {
    const cls = changeClass(item.change_pct);
    return `
      <article class="card">
        <div class="card-top">
          <div class="card-title">${item.name}</div>
          <div class="card-symbol">${item.symbol}</div>
        </div>
        <div class="price">${formatNumber(item.value, item.digits ?? 4)}</div>
        <div class="change ${cls}">${arrow(item.change_pct)} ${formatChange(item.change_pct)}</div>
        <div class="note">${cardNote(item)}</div>
      </article>
    `;
  }).join("");
}

function renderThermometer(){
  const usd = rawData.assets.find(x => x.key === "USDCNY")?.change_pct ?? 0;
  const aud = rawData.assets.find(x => x.key === "AUDCNY")?.change_pct ?? 0;
  const gold = rawData.assets.find(x => x.key === "XAUUSD")?.change_pct ?? 0;

  const rows = [
    {name:"美元", desc:"中国风险对冲", pct:usd},
    {name:"澳元", desc:"复苏与商品货币", pct:aud},
    {name:"黄金", desc:"全球避险与美元信用", pct:gold},
  ];

  document.getElementById("thermometer").innerHTML = rows.map(r => {
    const cls = Math.abs(r.pct) < 0.15 ? "neutral" : (r.pct > 0 ? "strong" : "weak");
    const text = cls === "neutral" ? "中性" : (cls === "strong" ? "偏强" : "偏弱");
    return `
      <div class="thermo-item">
        <div>
          <strong>${r.name}</strong>
          <div class="muted">${r.desc}</div>
        </div>
        <span class="badge ${cls}">${text}</span>
      </div>
    `;
  }).join("");
}

function signalText(key, value){
  if (key === "USDCNY") {
    if (value >= 7.0) return "美元明显转强，重视中国经济压力信号";
    if (value <= 6.7) return "人民币偏强，美元不急于追高";
    return "区间震荡，作为对冲仓位持有";
  }
  if (key === "AUDCNY") {
    if (value <= 4.6) return "进入重点观察/分批配置区";
    if (value >= 5.0) return "偏贵，谨慎追高";
    return "中性区间，适合分批而非一次性";
  }
  if (key === "JPYCNY100") {
    if (value <= 4.1) return "日本旅游换汇吸引力较高";
    if (value >= 4.6) return "偏贵，旅游需求外不急";
    return "正常区间，按旅游需求配置";
  }
  if (key === "XAUUSD") {
    if (value >= 3500) return "高位区，谨慎追涨";
    if (value <= 3000) return "中长期配置吸引力上升";
    return "作为组合对冲资产观察";
  }
  return "观察";
}

function renderSignals(){
  const keys = ["USDCNY","AUDCNY","JPYCNY100","XAUUSD"];
  const rows = rawData.assets.filter(x => keys.includes(x.key));
  document.getElementById("signals").innerHTML = rows.map(item => `
    <div class="signal-item">
      <div>
        <strong>${item.name}</strong>
        <div class="muted">${signalText(item.key, item.value)}</div>
      </div>
      <span class="badge neutral">${formatNumber(item.value, item.digits ?? 4)}</span>
    </div>
  `).join("");
}

function buildChart(type="fx"){
  const ctx = document.getElementById("trendChart");
  if (chart) chart.destroy();

  const labels = rawData.history.map(x => x.date);
  let datasets;

  if (type === "gold") {
    datasets = [
      { label:"国际金价 XAU/USD", data: rawData.history.map(x => x.XAUUSD), tension:.35 },
      { label:"人民币金价 元/克", data: rawData.history.map(x => x.XAUCNYG), tension:.35 },
    ];
  } else {
    datasets = [
      { label:"USD/CNY", data: rawData.history.map(x => x.USDCNY), tension:.35 },
      { label:"AUD/CNY", data: rawData.history.map(x => x.AUDCNY), tension:.35 },
      { label:"EUR/CNY", data: rawData.history.map(x => x.EURCNY), tension:.35 },
      { label:"100JPY/CNY", data: rawData.history.map(x => x.JPYCNY100), tension:.35 },
    ];
  }

  chart = new Chart(ctx, {
    type:"line",
    data:{ labels, datasets },
    options:{
      responsive:true,
      interaction:{mode:"index", intersect:false},
      plugins:{
        legend:{labels:{color:"#eef3ff"}},
        tooltip:{backgroundColor:"#0b1020", borderColor:"#243055", borderWidth:1}
      },
      scales:{
        x:{ticks:{color:"#92a0c2", maxTicksLimit:8}, grid:{color:"rgba(146,160,194,.12)"}},
        y:{ticks:{color:"#92a0c2"}, grid:{color:"rgba(146,160,194,.12)"}}
      }
    }
  });
}

async function init(){
  try {
    const res = await fetch("./data/latest.json", {cache:"no-store"});
    rawData = await res.json();
    document.getElementById("updated-at").textContent = rawData.updated_at || "未知";
    document.getElementById("data-status").classList.add("ok");
    renderCards();
    renderThermometer();
    renderSignals();
    buildChart("fx");
    document.getElementById("chart-select").addEventListener("change", e => buildChart(e.target.value));
  } catch (err) {
    document.getElementById("updated-at").textContent = "数据加载失败";
    console.error(err);
  }
}

init();
