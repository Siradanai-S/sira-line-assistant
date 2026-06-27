'use strict';

const { messagingClient } = require('../config/lineClient');
const config = require('../config/env');

/**
 * แปลง input ให้เป็น array ของ message objects ที่ LINE รองรับ
 * รับได้ทั้ง string เดี่ยว, message object เดี่ยว, หรือ array
 */
function normalizeMessages(messages) {
  const arr = Array.isArray(messages) ? messages : [messages];
  return arr.map((m) => (typeof m === 'string' ? { type: 'text', text: m } : m));
}

/** ตอบกลับด้วย replyToken (ใช้ได้ครั้งเดียว ภายในไม่กี่นาที) */
async function reply(replyToken, messages) {
  return messagingClient.replyMessage({
    replyToken,
    messages: normalizeMessages(messages)
  });
}

/** ส่งข้อความแบบ push ไปยัง userId (ใช้สำหรับ cron / แจ้งเตือน) */
async function push(userId, messages) {
  return messagingClient.pushMessage({
    to: userId,
    messages: normalizeMessages(messages)
  });
}

/** ส่ง push ไปยัง PM ที่ตั้งค่าไว้ใน env (PM_LINE_USER_ID) */
async function pushToPM(messages) {
  if (!config.line.pmUserId) {
    console.warn('[LINE] ยังไม่ได้ตั้งค่า PM_LINE_USER_ID — ข้ามการ push');
    return null;
  }
  return push(config.line.pmUserId, messages);
}

module.exports = {
  reply,
  push,
  pushToPM,
  normalizeMessages
};
