'use strict';

const line = require('@line/bot-sdk');
const config = require('./env');

/** ค่า config กลางสำหรับ middleware ตรวจ signature ของ webhook */
const lineConfig = {
  channelAccessToken: config.line.channelAccessToken,
  channelSecret: config.line.channelSecret
};

/** client สำหรับส่งข้อความ (reply / push) */
const messagingClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.line.channelAccessToken
});

/** client สำหรับดึงไฟล์แนบ/เสียง (binary content) ผ่าน LINE Content API */
const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: config.line.channelAccessToken
});

module.exports = {
  line,
  lineConfig,
  messagingClient,
  blobClient
};
