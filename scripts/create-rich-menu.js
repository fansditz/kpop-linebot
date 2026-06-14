require("dotenv").config();

const fs = require("fs");
const path = require("path");
const line = require("@line/bot-sdk");

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const richMenu = {
  size: {
    width: 2500,
    height: 1686,
  },
  selected: true,
  name: "韓情脈脈主選單",
  chatBarText: "韓情脈脈",
  areas: [
    area(0, 0, 833, 843, "女團"),
    area(833, 0, 834, 843, "男團"),
    area(1667, 0, 833, 843, "關鍵字搜尋"),
    area(0, 843, 833, 843, "今日抽卡"),
    area(833, 843, 834, 843, "回歸日期"),
    area(1667, 843, 833, 843, "其他連結"),
  ],
};

function area(x, y, width, height, text) {
  const action =
    text === "今日抽卡" && cardPageUrl()
      ? {
          type: "uri",
          uri: cardPageUrl(),
        }
      : {
          type: "message",
          text,
        };

  return {
    bounds: { x, y, width, height },
    action,
  };
}

function cardPageUrl() {
  const baseUrl = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/card/`;
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

async function main() {
  const imagePath = path.resolve(__dirname, "../assets/rich-menu.png");

  if (!fs.existsSync(imagePath)) {
    throw new Error("找不到 assets/rich-menu.png，請先確認主選單圖檔存在。");
  }

  const richMenuId = await client.createRichMenu(richMenu);
  await client.setRichMenuImage(richMenuId, fs.createReadStream(imagePath), "image/png");
  await client.setDefaultRichMenu(richMenuId);

  console.log(`Rich menu created: ${richMenuId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
