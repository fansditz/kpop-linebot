require("dotenv").config();

const express = require("express");
const path = require("path");
const line = require("@line/bot-sdk");
const groups = require("./data/groups.json");
const comebacks = require("./data/comebacks.json");
const links = require("./data/links.json");

const app = express();
const port = process.env.PORT || 3000;

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(lineConfig);

app.use("/card", express.static(path.resolve(__dirname, "../public/card")));

app.get("/", (_req, res) => {
  res.json({
    name: "韓情脈脈",
    status: "ok",
    features: ["女團", "男團", "關鍵字搜尋", "今日抽卡", "回歸日期", "其他連結"],
  });
});

app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const text = normalize(event.message.text);
  const reply = buildReply(text);
  return client.replyMessage(event.replyToken, reply);
}

function normalize(text) {
  return text.trim().replace(/\s+/g, " ");
}

function buildReply(text) {
  if (matches(text, ["女團", "girl", "girls", "女團查詢"])) {
    return groupCarousel("girl");
  }

  if (matches(text, ["男團", "boy", "boys", "男團查詢"])) {
    return groupCarousel("boy");
  }

  if (matches(text, ["關鍵字搜尋", "搜尋", "查詢", "keyword"])) {
    return keywordHelpMessage();
  }

  if (matches(text, ["回歸日期", "回歸", "comeback", "本月回歸"])) {
    return comebackMessage();
  }

  if (matches(text, ["今日抽卡", "抽小卡", "小卡", "抽卡"])) {
    return photocardMessage();
  }

  if (matches(text, ["其他連結", "連結", "官方連結", "links"])) {
    return linkMessage();
  }

  if (text.startsWith("搜尋 ") || text.startsWith("查詢 ")) {
    return searchMessage(text.replace(/^(搜尋|查詢)\s*/, ""));
  }

  const directSearch = searchGroups(text);
  if (directSearch.length > 0) {
    return searchMessage(text);
  }

  return welcomeMessage();
}

function keywordHelpMessage() {
  return {
    type: "text",
    text: "請輸入「搜尋 + 關鍵字」，例如：\n搜尋 aespa\n搜尋 Winter\n搜尋 SM Entertainment\n搜尋 CARAT",
  };
}

function matches(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower === keyword.toLowerCase());
}

function welcomeMessage() {
  return {
    type: "flex",
    altText: "韓情脈脈主選單",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          textBox("韓情脈脈", "xxl", true),
          textBox("想追回歸、查團體資料，或抽一張今日小卡，都可以從下方開始。", "sm", false),
          quickMenu(),
        ],
      },
    },
  };
}

function quickMenu() {
  const items = ["女團", "男團", "關鍵字搜尋", "今日抽卡", "回歸日期", "其他連結"];
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: items.map((label) => ({
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "message",
        label,
        text: label === "關鍵字搜尋" ? "搜尋 aespa" : label,
      },
    })),
  };
}

function groupCarousel(category) {
  const selected = groups.filter((group) => group.category === category);

  return {
    type: "flex",
    altText: category === "girl" ? "女團清單" : "男團清單",
    contents: {
      type: "carousel",
      contents: selected.map(groupBubble),
    },
  };
}

function groupBubble(group) {
  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        textBox(group.name, "xl", true),
        textBox(group.koreanName, "sm", false, "#777777"),
        separator(),
        infoRow("出道日期", group.debutDate),
        infoRow("經紀公司", group.company),
        infoRow("粉絲名", group.fandom),
        infoRow("代表色", group.representativeColor),
        infoRow("MBTI", group.mbti),
        infoRow("成員", group.members.join("、")),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          action: {
            type: "uri",
            label: "官方帳號",
            uri: group.officialUrl,
          },
        },
      ],
    },
  };
}

function searchMessage(keyword) {
  const matchedGroups = searchGroups(keyword);
  const matchedComebacks = comebacks.filter((item) =>
    [item.artist, item.title, item.type].some((value) => value.toLowerCase().includes(keyword.toLowerCase())),
  );

  if (matchedGroups.length === 0 && matchedComebacks.length === 0) {
    return {
      type: "text",
      text: `找不到「${keyword}」相關資料。可以試試團名、成員名、粉絲名或公司名稱。`,
    };
  }

  const lines = [`「${keyword}」搜尋結果`];
  matchedGroups.forEach((group) => {
    lines.push(`\n${group.name}｜${group.company}`);
    lines.push(`成員：${group.members.join("、")}`);
    lines.push(`粉絲名：${group.fandom}`);
  });

  matchedComebacks.forEach((item) => {
    lines.push(`\n${item.date} ${item.artist}`);
    lines.push(`${item.title}｜${item.type}`);
  });

  return { type: "text", text: lines.join("\n") };
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
    return values.some((value) => value.toLowerCase().includes(lower));
  });
}

function comebackMessage() {
  const monthly = comebacks.filter((item) => item.section === "monthly");
  const upcoming = comebacks.filter((item) => item.section === "upcoming");
  const weekly = comebacks.filter((item) => item.section === "weekly");

  return {
    type: "flex",
    altText: "回歸日期",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          textBox("回歸日期", "xl", true),
          comebackSection("本月回歸清單", monthly),
          comebackSection("團體預計發片日期", upcoming),
          comebackSection("當週新歌發表", weekly),
        ],
      },
    },
  };
}

function comebackSection(title, items) {
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    contents: [
      textBox(title, "md", true),
      ...items.map((item) => textBox(`${item.date}｜${item.artist} - ${item.title}`, "sm", false, "#555555")),
    ],
  };
}

function photocardMessage() {
  const url = cardPageUrl();

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
          textBox("點一下按鈕，開啟抽卡網頁。", "sm", false),
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

function cardPageUrl() {
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
  return `${baseUrl.replace(/\/$/, "")}/card/`;
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

function infoRow(label, value) {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: label,
        color: "#8A817C",
        size: "xs",
        flex: 2,
      },
      {
        type: "text",
        text: value,
        color: "#222222",
        size: "xs",
        flex: 5,
        wrap: true,
      },
    ],
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
  console.log(`韓情脈脈 LINE Bot is running on port ${port}`);
});
