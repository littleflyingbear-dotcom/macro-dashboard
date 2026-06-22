# Larry 宏观资产仪表盘 V1

这是一个可部署到 GitHub Pages 的静态网页项目，用来每日观察：

- USD/CNY 美元兑人民币
- AUD/CNY 澳元兑人民币
- EUR/CNY 欧元兑人民币
- 100JPY/CNY 100日元兑人民币
- XAU/USD 国际金价
- CNY/克 人民币金价估算

## 文件结构

```text
macro-dashboard/
├── index.html
├── style.css
├── app.js
├── data/
│   └── latest.json
├── scripts/
│   └── fetch_data.py
└── .github/
    └── workflows/
        └── update-data.yml
```

## 部署步骤

1. 在 GitHub 新建仓库，例如 `macro-dashboard`
2. 上传本项目全部文件
3. 进入仓库 Settings → Pages
4. Source 选择 `Deploy from a branch`
5. Branch 选择 `main`，Folder 选择 `/root`
6. 保存后等待 1-2 分钟
7. 访问：
   `https://你的GitHub用户名.github.io/macro-dashboard/`

## 自动更新

GitHub Actions 会在每个工作日北京时间早上 8 点自动运行：

```text
.github/workflows/update-data.yml
```

也可以手动运行：

Actions → Update macro dashboard data → Run workflow

## 数据说明

V1 使用 Yahoo Finance chart API 抓取汇率和国际黄金数据，无需 API Key。

人民币金价目前为估算值：

```text
国际金价 XAU/USD × USD/CNY ÷ 31.1034768
```

单位为人民币/克。

这不是上海黄金交易所官方价格，但适合作为每日观察近似值。

## 后续可升级

- 增加 DXY 美元指数
- 增加 10年期美债收益率
- 增加铁矿石、铜价
- 增加恒生指数、沪深300
- 接入更准确的上海金官方或商业数据源
