# 韓情脈脈 LINE Bot

「韓情脈脈」是一個 K-POP 主題 LINE Bot 範本，主選單採六宮格設計，提供女團、男團、關鍵字搜尋、今日抽卡、回歸日期與其他連結。

## 功能

- 女團 / 男團：查詢團體名稱、成員藝名、出道日期、經紀公司、粉絲名、代表色、MBTI、官方應援色與帳號。
- 關鍵字搜尋：用團名、成員名、粉絲名或公司快速搜尋。
- 今日抽卡：抽一張「今日幸運偶像」小卡，並附上拍貼梗與 IG 貼文靈感。
- 回歸日期：查看本月回歸清單、預計發片日期與本週新歌表。
- 其他連結：提供 YouTube、Instagram、Weverse、X 等入口。

## 啟動

1. 安裝套件：

   ```bash
   npm install
   ```

2. 複製 `.env.example` 為 `.env`，填入 LINE Developers 的 Channel access token 與 Channel secret。

3. 啟動服務：

   ```bash
   npm start
   ```

4. 將 LINE Developers Webhook URL 設為：

   ```text
   https://你的網域/webhook
   ```

5. 若要讓「今日抽卡」直接開啟網頁，請在 `.env` 加上公開網址：

   ```text
   PUBLIC_BASE_URL=https://你的網域
   ```

   抽卡網頁會在 `https://你的網域/card/`。

## 主選單圖稿

主選單圖稿在 `assets/rich-menu.svg`，尺寸為 LINE rich menu 常用的 `2500 x 1686`。若要建立 rich menu，可先把 SVG 轉成 PNG 或 JPG 後放到 `assets/rich-menu.png`，再執行：

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
