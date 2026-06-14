# K-POP LINE Bot

這是一個 K-POP LINE Bot，包含圖文選單、AI 爬蟲查詢、線上抽卡網站和常用連結。

## 選單功能

- 女團：送出「女團」，由 LINE Official Account Manager 觸發多頁訊息。
- 男團：送出「男團」，由 LINE Official Account Manager 觸發多頁訊息。
- 關鍵字搜尋：先回覆「想查詢內容」，等待使用者輸入後送到 AI 爬蟲 webhook。
- 今日抽卡：開啟 `/card/` 線上抽卡網站。
- 回歸日期：顯示兩頁選項。
  - 查詢特定團體：詢問團體名稱，再送到 AI 爬蟲 webhook。
  - 查詢所有團體：直接送到 AI 爬蟲 webhook 查詢所有團體回歸日。
- 其他連結：顯示 YT、Weverse、X 三個連結按鈕。

## 環境設定

```text
LINE_CHANNEL_ACCESS_TOKEN=你的 Channel access token
LINE_CHANNEL_SECRET=你的 Channel secret
PORT=3000
PUBLIC_BASE_URL=https://你的公開網址
KPOP_CRAWLER_WEBHOOK_URL=https://hook.eu1.make.com/xjh78fwmp21u6r226f6w8cq576byorfr
```

`PUBLIC_BASE_URL` 需要是 LINE 使用者能開啟的公開網址，例如 Render、Railway 或 Cloudflare Tunnel 網址。今日抽卡會使用：

```text
https://你的公開網址/card/
```

## AI Webhook Payload

Bot 會優先用 `POST` 呼叫 AI webhook，格式如下：

```json
{
  "action": "keyword_search",
  "query": "aespa",
  "keyword": "aespa"
}
```

回歸日期查詢會使用：

```json
{
  "action": "comeback_group",
  "query": "IVE",
  "group": "IVE"
}
```

```json
{
  "action": "comeback_all",
  "query": "查詢所有團體回歸日期"
}
```

Webhook 回傳純文字，或 JSON 裡的 `reply`、`message`、`summary`、`text`、`answer`、`result` 都可以。

## 啟動

```bash
npm install
npm start
```

LINE Developers 的 Webhook URL 設定成：

```text
https://你的公開網址/webhook
```

## 重新建立圖文選單

如果有改過圖文選單按鈕或第一次上線，執行：

```bash
npm run richmenu:create
```

目前六個區塊送出的文字是：

```text
女團
男團
關鍵字搜尋
今日抽卡
回歸日期
其他連結
```

## 重新測試

1. 確認 `.env` 已設定 `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、`PUBLIC_BASE_URL`、`KPOP_CRAWLER_WEBHOOK_URL`。
2. 啟動服務：`npm start`。
3. 在 LINE Developers 按下 Verify，確認 webhook 回應成功。
4. 在 LINE 官方帳號聊天室依序點選六個選單：
   - 女團：應由 LINE Official Account Manager 跳出女團多頁訊息。
   - 男團：應由 LINE Official Account Manager 跳出男團多頁訊息。
   - 關鍵字搜尋：應先看到「想查詢內容」，回覆任意關鍵字後會收到 AI 爬蟲結果。
   - 今日抽卡：應開啟線上抽卡網站。
   - 回歸日期：應看到「查詢特定團體」和「查詢所有團體」兩頁選項。
   - 其他連結：應看到 YT、Weverse、X 三個按鈕。
5. 若 rich menu 按鈕仍送出舊文字，重新執行 `npm run richmenu:create`，再重新打開 LINE 聊天室測試。
