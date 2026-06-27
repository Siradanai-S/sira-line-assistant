'use strict';

const voiceService = require('../services/voiceService');
const taskService = require('../services/taskService');
const lineMessaging = require('../services/lineMessaging');

/**
 * จัดการข้อความเสียง (message type = 'audio')
 * ถอดเสียง -> บันทึกเป็น To-Do -> ตอบยืนยัน
 */
async function handleAudio(event) {
  const replyToken = event.replyToken;
  const userId = event.source?.userId;
  const messageId = event.message.id;

  // ตอบรับก่อน เพราะการถอดเสียงด้วย Gemini อาจใช้เวลา
  await lineMessaging.reply(replyToken, '🎙️ กำลังถอดเสียงและบันทึกงาน...');

  try {
    const transcript = await voiceService.transcribeAudio(messageId);

    if (!transcript || transcript.length < 2) {
      await lineMessaging.push(userId, 'ไม่สามารถถอดข้อความจากเสียงได้ ลองอัดใหม่อีกครั้งนะครับ');
      return;
    }

    const task = await taskService.createTask({
      userId,
      description: transcript,
      source: 'voice'
    });

    await lineMessaging.push(
      userId,
      `✅ บันทึกงานจากเสียงแล้ว\n\n📝 "${task.task_description}"\n\nสถานะ: รอดำเนินการ (Pending)`
    );
  } catch (err) {
    console.error('[Audio] ถอดเสียงไม่สำเร็จ:', err.message);
    await lineMessaging.push(userId, `❌ ถอดเสียงไม่สำเร็จ (${err.message})`);
  }
}

module.exports = {
  handleAudio
};
