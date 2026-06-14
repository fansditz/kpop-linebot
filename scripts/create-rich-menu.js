require("dotenv").config();

const fs = require("fs");
const path = require("path");
const line = require("@line/bot-sdk");

const MENU = {
  GIRL_GROUPS: "女團",
  BOY_GROUPS: "男團",
  KEYWORD_SEARCH: "關鍵字搜尋",
  PHOTOCARD: "今日抽卡",
  COMEBACKS: "回歸日期",
  LINKS: "其他連結",
};

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
  name: "K-POP 選單",
  chatBarText: "K-POP 選單",
  areas: [
    area(0, 0, 833, 843, MENU.GIRL_GROUPS),
    area(833, 0, 834, 843, MENU.BOY_GROUPS),
    area(1667, 0, 833, 843, MENU.KEYWORD_SEARCH),
    area(0, 843, 833, 843, MENU.PHOTOCARD),
    area(833, 843, 834, 843, MENU.COMEBACKS),
    area(1667, 843, 833, 843, MENU.LINKS),
  ],
};

function area(x, y, width, height, text) {
  const cardUrl = cardPageUrl();
  const action =
    text === MENU.PHOTOCARD && cardUrl
      ? {
          type: "uri",
          uri: cardUrl,
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
    throw new Error("找不到 assets/rich-menu.png，請先放入 2500 x 1686 的 rich menu 圖片。");
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
