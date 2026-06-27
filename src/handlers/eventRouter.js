'use strict';

const { handleText } = require('./textHandler');
const { handleFile } = require('./fileHandler');
const { handleAudio } = require('./audioHandler');
const { handlePostback } = require('./postbackHandler');
const lineMessaging = require('../services/lineMessaging');

/**
 * รับ event เดียวจาก LINE แล้วส่งต่อให้ handler ที่เหมาะสม
 * ครอบ try/catch รายตัว เพื่อให้ event อื่นใน batch เดียวกันยังทำงานต่อได้
 */
async function routeEvent(event) {
  try {
    if (event.type === 'message') {
      const messageType = event.message.type;

      switch (messageType) {
        case 'text':
          return await handleText(event);
        case 'file':
          return await handleFile(event);
        case 'audio':
          return await handleAudio(event);
        case 'image':
        case 'video':
        case 'sticker':
        case 'location':
          return await lineMessaging.reply(
            event.replyToken,
            'รับข้อความแล้วครับ — รองรับ: ข้อความนัดหมาย, ไฟล์ PDF/Word/Excel, และข้อความเสียง'
          );
        default:
          return null;
      }
    }

    if (event.type === 'postback') {
      return await handlePostback(event);
    }

    if (event.type === 'follow') {
      return await lineMessaging.reply(
        event.replyToken,
        'สวัสดีครับ ผมคือเลขาฯ ส่วนตัวของคุณ 🤖\nพิมพ์ /help เพื่อเริ่มใช้งานได้เลย'
      );
    }

    return null;
  } catch (err) {
    console.error(`[Router] จัดการ event ประเภท ${event.type} ล้มเหลว:`, err.message);
    // พยายามตอบกลับถ้ายังมี replyToken ที่ใช้ได้
    if (event.replyToken) {
      try {
        await lineMessaging.reply(event.replyToken, '❌ เกิดข้อผิดพลาดภายในระบบ ลองใหม่อีกครั้งครับ');
      } catch (_) {
        /* reply token อาจถูกใช้ไปแล้ว — เพิกเฉยได้ */
      }
    }
    return null;
  }
}

/** จัดการ event ทั้ง batch (LINE ส่งมาเป็น array) */
async function routeEvents(events) {
  return Promise.all(events.map((event) => routeEvent(event)));
}

module.exports = {
  routeEvent,
  routeEvents
};
