require("dotenv").config();

const express = require("express");
const path = require("path");
const line = require("@line/bot-sdk");
const groups = require("./data/groups.json");
const comebacks = require("./data/comebacks.json");
const links = require("./data/links.json");

const app = express();
const port = process.env.PORT || 3000;
const userSessions = new Map();

const DEFAULT_CRAWLER_WEBHOOK_URL = "https://hook.eu1.make.com/xjh78fwmp21u6r226f6w8cq576byorfr";

const MENU = {
  GIRL_GROUPS: "女團",
  BOY_GROUPS: "男團",
  KEYWORD_SEARCH: "關鍵字搜尋",
  PHOTOCARD: "今日抽卡",
  COMEBACKS: "回歸日期",
  LINKS: "其他連結",
};

const LINE_MANAGER_KEYWORDS = new Set([MENU.GIRL_GROUPS, MENU.BOY_GROUPS]);

app.set("trust proxy", true);

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(lineConfig);

app.use("/card", express.static(path.resolve(__dirname, "../public/card")));

app.get("/", (_req, res) => {
  res.json({
    name: "K-POP LINE Bot",
    status: "ok",
    features: Object.values(MENU),
  });
});

app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  try {
    await Promise.all(req.body.events.map((event) => handleEvent(event, req)));
    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

async function handleEvent(event, req) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const text = normalize(event.message.text);
  const userId = event.source?.userId || event.source?.roomId || event.source?.groupId || "anonymous";
  const reply = await buildReply(text, req, userId);

  if (!reply) {
    return null;
  }

  return client.replyMessage(event.replyToken, reply);
}

function normalize(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

async function buildReply(text, req, userId) {
  const session = userSessions.get(userId);

  if (LINE_MANAGER_KEYWORDS.has(text)) {
    userSessions.delete(userId);
    return null;
  }

  if (session?.mode === "awaiting-keyword") {
    userSessions.delete(userId);
    return keywordSearchMessage(text);
  }

  if (session?.mode === "awaiting-comeback-group") {
    userSessions.delete(userId);
    return comebackGroupMessage(text);
  }

  if (matches(text, [MENU.KEYWORD_SEARCH, "keyword", "search"])) {
    userSessions.set(userId, { mode: "awaiting-keyword" });
    return textMessage("想查詢內容");
  }

  if (matches(text, [MENU.PHOTOCARD, "photocard", "card"])) {
    return photocardMessage(req);
  }

  if (matches(text, [MENU.COMEBACKS, "comeback", "comebacks", "回歸"])) {
    return comebackMenuMessage();
  }

  if (matches(text, ["查詢特定團體"])) {
    userSessions.set(userId, { mode: "awaiting-comeback-group" });
    return textMessage("請輸入想查詢的團體名稱");
  }

  if (matches(text, ["查詢所有團體"])) {
    return comebackAllMessage();
  }

  if (matches(text, [MENU.LINKS, "links", "link"])) {
    return linkMessage();
  }

  const searchKeyword = stripSearchPrefix(text);
  if (searchKeyword !== text || /^(keyword|search)\s+/i.test(text)) {
    return keywordSearchMessage(searchKeyword);
  }

  return welcomeMessage();
}

function matches(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower === keyword.toLowerCase());
}

function stripSearchPrefix(text) {
  return text.replace(/^(搜尋|查詢|關鍵字|keyword|search)\s*/i, "").trim();
}

function textMessage(text) {
  return { type: "text", text };
}

function welcomeMessage() {
  return {
    type: "flex",
    altText: "K-POP 選單",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          textBox("K-POP 選單", "xl", true),
          textBox("請點選下方功能，或直接從圖文選單操作。", "sm", false, "#555555"),
          quickMenu(),
        ],
      },
    },
  };
}

function quickMenu() {
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: Object.values(MENU).map((label) => ({
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "message",
        label,
        text: label,
      },
    })),
  };
}

async function keywordSearchMessage(keyword) {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) {
    return textMessage("想查詢內容");
  }

  const crawlerResult = await crawlWithMake({
    action: "keyword_search",
    query: cleanKeyword,
    keyword: cleanKeyword,
  });

  if (crawlerResult) {
    return textMessage(crawlerResult);
  }

  const matchedGroups = searchGroups(cleanKeyword);
  const matchedComebacks = searchComebacks(cleanKeyword);

  if (matchedGroups.length === 0 && matchedComebacks.length === 0) {
    return textMessage(`找不到「${cleanKeyword}」的資料，請換一個關鍵字再試一次。`);
  }

  return textMessage(formatSearchFallback(cleanKeyword, matchedGroups, matchedComebacks));
}

function formatSearchFallback(keyword, matchedGroups, matchedComebacks) {
  const lines = [`「${keyword}」查詢結果`];

  matchedGroups.slice(0, 3).forEach((group) => {
    lines.push("", `${group.name}${group.koreanName ? `（${group.koreanName}）` : ""}`);
    lines.push(`公司：${group.company}`);
    lines.push(`成員：${group.members.join("、")}`);
    lines.push(`粉絲名：${group.fandom}`);
  });

  matchedComebacks.slice(0, 5).forEach((item) => {
    lines.push("", `${item.date} ${item.artist}`);
    lines.push(`${item.title}（${item.type}）`);
  });

  return lines.join("\n");
}

function comebackMenuMessage() {
  return {
    type: "flex",
    altText: "回歸日期",
    contents: {
      type: "carousel",
      contents: [
        {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              textBox("查詢特定團體", "xl", true),
              textBox("輸入團體名稱後，會用 AI 爬蟲查詢該團體回歸日期。", "sm", false, "#555555"),
              {
                type: "button",
                style: "primary",
                action: {
                  type: "message",
                  label: "查詢特定團體",
                  text: "查詢特定團體",
                },
              },
            ],
          },
        },
        {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              textBox("查詢所有團體", "xl", true),
              textBox("直接用 AI 爬蟲整理所有團體近期回歸日期。", "sm", false, "#555555"),
              {
                type: "button",
                style: "primary",
                action: {
                  type: "message",
                  label: "查詢所有團體",
                  text: "查詢所有團體",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function comebackGroupMessage(groupName) {
  const cleanGroupName = groupName.trim();
  if (!cleanGroupName) {
    return textMessage("請輸入想查詢的團體名稱");
  }

  const crawlerResult = await crawlWithMake({
    action: "comeback_group",
    query: cleanGroupName,
    group: cleanGroupName,
  });

  if (crawlerResult) {
    return textMessage(crawlerResult);
  }

  const matchedComebacks = searchComebacks(cleanGroupName);
  if (matchedComebacks.length === 0) {
    return textMessage(`目前找不到「${cleanGroupName}」的回歸日期。`);
  }

  return textMessage(formatComebacks(`「${cleanGroupName}」回歸日期`, matchedComebacks));
}

async function comebackAllMessage() {
  const crawlerResult = await crawlWithMake({
    action: "comeback_all",
    query: "查詢所有團體回歸日期",
  });

  if (crawlerResult) {
    return textMessage(crawlerResult);
  }

  return textMessage(formatComebacks("近期回歸日期", comebacks));
}

function formatComebacks(title, items) {
  const lines = [title];
  items.slice(0, 10).forEach((item) => {
    lines.push(`${item.date} ${item.artist} - ${item.title}（${item.type}）`);
  });
  return lines.join("\n");
}

async function crawlWithMake(payload) {
  const endpoint = crawlerWebhookUrl();
  if (!endpoint) {
    return null;
  }

  try {
    const postResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json, text/plain",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (postResponse.ok) {
      return extractCrawlerText(await readCrawlerResponse(postResponse));
    }

    console.warn(`Crawler POST failed with status ${postResponse.status}`);
  } catch (error) {
    console.warn(`Crawler POST failed: ${error.message}`);
  }

  try {
    const query = payload.query || payload.keyword || payload.group || "";
    const getResponse = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&action=${encodeURIComponent(payload.action)}`, {
      headers: { accept: "application/json, text/plain" },
      signal: AbortSignal.timeout(15000),
    });

    if (!getResponse.ok) {
      console.warn(`Crawler GET failed with status ${getResponse.status}`);
      return null;
    }

    return extractCrawlerText(await readCrawlerResponse(getResponse));
  } catch (error) {
    console.warn(`Crawler GET failed: ${error.message}`);
    return null;
  }
}

function crawlerWebhookUrl() {
  return normalizeBaseUrl(process.env.KPOP_CRAWLER_WEBHOOK_URL)
    || normalizeBaseUrl(process.env.KPOP_SEARCH_API_URL)
    || DEFAULT_CRAWLER_WEBHOOK_URL;
}

async function readCrawlerResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function extractCrawlerText(data) {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return data.trim() || null;
  }

  if (Array.isArray(data)) {
    return data.map(extractCrawlerText).filter(Boolean).join("\n") || null;
  }

  if (Array.isArray(data.results)) {
    return data.results
      .slice(0, 5)
      .map((item) => extractCrawlerText(item))
      .filter(Boolean)
      .join("\n");
  }

  return data.reply || data.message || data.summary || data.text || data.answer || data.result || null;
}

function searchGroups(keyword) {
  const lower = keyword.toLowerCase();
  return groups.filter((group) => {
    const values = [
      group.name,
      group.koreanName,
      group.company,
      group.fandom,
      group.representativeColor,
      ...group.members,
    ];
    return values.some((value) => String(value || "").toLowerCase().includes(lower));
  });
}

function searchComebacks(keyword) {
  const lower = keyword.toLowerCase();
  return comebacks.filter((item) =>
    [item.artist, item.title, item.type, item.date].some((value) => String(value || "").toLowerCase().includes(lower)),
  );
}

function photocardMessage(req) {
  const url = cardPageUrl(req);

  if (!url) {
    return textMessage("今日抽卡網站還沒有公開網址，請先設定 PUBLIC_BASE_URL。");
  }

  return {
    type: "flex",
    altText: "今日抽卡",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          textBox("今日抽卡", "xl", true),
          textBox("點下方按鈕開啟線上抽卡網站。", "sm", false, "#555555"),
          separator(),
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "開始抽卡",
              uri: url,
            },
          },
        ],
      },
    },
  };
}

function cardPageUrl(req) {
  const configuredBaseUrl = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/card/`;
  }

  const forwardedHost = firstForwardedValue(req?.get("x-forwarded-host"));
  const forwardedProto = firstForwardedValue(req?.get("x-forwarded-proto"));
  const host = forwardedHost || req?.hostname || req?.get("host");
  if (!host || /^localhost(:|$)|^127\.0\.0\.1(:|$)/.test(host)) {
    return null;
  }

  const protocol =
    forwardedProto || (host.includes("trycloudflare.com") || host.includes("loca.lt") ? "https" : req.protocol);
  return `${protocol}://${host}/card/`;
}

function firstForwardedValue(value) {
  return value?.split(",")[0]?.trim();
}

function normalizeBaseUrl(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function linkMessage() {
  return {
    type: "flex",
    altText: "其他連結",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          textBox("其他連結", "xl", true),
          ...links.map((item) => ({
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: item.label,
              uri: item.url,
            },
          })),
        ],
      },
    },
  };
}

function textBox(text, size, bold, color = "#222222") {
  return {
    type: "text",
    text,
    size,
    weight: bold ? "bold" : "regular",
    color,
    wrap: true,
  };
}

function separator() {
  return {
    type: "separator",
    margin: "md",
    color: "#E3DED7",
  };
}

app.listen(port, () => {
  console.log(`K-POP LINE Bot is running on port ${port}`);
});
