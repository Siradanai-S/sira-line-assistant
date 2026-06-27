'use strict';

const fileService = require('../services/fileService');
const lineMessaging = require('../services/lineMessaging');

const SUPPORTED_EXT = ['.pdf', '.docx', '.xlsx', '.xls'];

/**
 * จัดการไฟล์แนบ (message type = 'file')
 * LINE จะส่ง event.message.fileName มาด้วยเสมอสำหรับ type นี้
 */
async function handleFile(event) {
  const replyToken = event.replyToken;
  const userId = event.source?.userId;
  const messageId = event.message.id;
  const fileName = event.message.fileName || 'document';

  const lower = fileName.toLowerCase();
  const isSupported = SUPPORTED_EXT.some((ext) => lower.endsWith(ext));

  if (!isSupported) {
    return lineMessaging.reply(
      replyToken,
      `ไฟล์ "${fileName}" ยังไม่รองรับการสรุป\nรองรับ: PDF, Word (.docx), Excel (.xlsx/.xls)`
    );
  }

  // ตอบรับทันทีว่ากำลังประมวลผล (เพราะการสรุปอาจใช้เวลาเกิน reply token)
  await lineMessaging.reply(replyToken, `📄 กำลังอ่านและสรุป "${fileName}" สักครู่นะครับ...`);

  try {
    const summary = await fileService.ingestAndSummarize(messageId, fileName);
    const message = `📑 บทสรุป: ${fileName}\n\n${summary}`;
    // ใช้ push เพราะ reply token ถูกใช้ไปแล้ว
    await lineMessaging.push(userId, message);
  } catch (err) {
    console.error('[File] สรุปไม่สำเร็จ:', err.message);
    await lineMessaging.push(userId, `❌ ขออภัย อ่านไฟล์ "${fileName}" ไม่สำเร็จ (${err.message})`);
  }
}

module.exports = {
  handleFile
};
