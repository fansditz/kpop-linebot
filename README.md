# 韓情脈脈 LINE Bot

「韓情脈脈」是一個 K-POP 主題 LINE Bot 範本，主選單採六宮格設計，提供女團、男團、關鍵字搜尋、今日抽卡、回歸日期與其他連結。

## 功能

- 女團 / 男團：查詢團體名稱、成員藝名、出道日期、經紀公司、粉絲名、代表色、MBTI、官方應援色與帳號。
- 關鍵字搜尋：用團名、成員名、粉絲名或公司快速搜尋。
- 今日抽卡：抽一張「今日幸運偶像」小卡，並附上拍貼梗與 IG 貼文靈感。
- 回歸日期：查看本月回歸清單、預計發片日期與本週新歌表。
- 其他連結：提供 YouTube、Instagram、Weverse、X 等入口。

## 固定網址部署

建議部署到 Render 或 Railway，部署後會得到固定網址，例如：

```text
https://你的服務名稱.onrender.com
https://你的服務名稱.up.railway.app
```

之後 LINE Developers 的 Webhook URL 固定填：

```text
https://你的固定網址/webhook
```

「今日抽卡」頁面會固定在：

```text
https://你的固定網址/card/
```

### Render

1. 將專案推到 GitHub。
2. 到 Render 建立 `New Web Service`，選擇這個 repo。
3. Render 會讀取 `render.yaml`，使用：
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/`
4. 在 Render 的 Environment Variables 填入：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `PUBLIC_BASE_URL=https://你的服務名稱.onrender.com`
5. 部署完成後，把 LINE Developers 的 Webhook URL 設為：

   ```text
   https://你的服務名稱.onrender.com/webhook
   ```

### Railway

1. 將專案推到 GitHub。
2. 到 Railway 建立 `New Project`，選擇 `Deploy from GitHub repo`。
3. Railway 會讀取 `railway.json`，用 `npm start` 啟動服務。
4. 在 Variables 填入：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `PUBLIC_BASE_URL=https://你的服務名稱.up.railway.app`
5. 部署完成後，把 LINE Developers 的 Webhook URL 設為：

   ```text
   https://你的服務名稱.up.railway.app/webhook
   ```

### Cloud Run

專案也附上 `Dockerfile`，可以部署到 Cloud Run。部署時同樣設定：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `PUBLIC_BASE_URL=https://你的-cloud-run網址`

Webhook URL 設為：

```text
https://你的-cloud-run網址/webhook
```

## 本機啟動

1. 安裝套件：

   ```bash
   npm install
   ```

2. 複製 `.env.example` 為 `.env`，填入 LINE Developers 的 Channel access token 與 Channel secret。

3. 啟動服務：

   ```bash
   npm start
   ```

4. 若只是本機測試，可用 Cloudflare Tunnel 產生臨時網址，將 LINE Developers Webhook URL 設為：

   ```text
   https://你的網域/webhook
   ```

5. 若要讓「今日抽卡」直接開啟網頁，請在 `.env` 加上公開網址。正式部署時請填 Render 或 Railway 的固定網址：

   ```text
   PUBLIC_BASE_URL=https://你的網域
   ```

   抽卡網頁會在 `https://你的網域/card/`。

## 主選單圖稿

主選單圖稿以 `assets/rich-menu.png` 為準，尺寸為 LINE rich menu 常用的 `2500 x 1686`。`assets/rich-menu.svg` 會引用同一張 PNG，方便需要 SVG 檔名的工具預覽。

若要將目前圖稿建立成 LINE rich menu，執行：

```bash
npm run richmenu:create
```

## 指令範例

- `女團`
- `男團`
- `回歸日期`
- `今日抽卡`
- `搜尋 aespa`
- `其他連結`
