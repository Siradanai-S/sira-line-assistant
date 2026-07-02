'use strict';

const voiceService = require('../services/voiceService');
const nlpService = require('../services/nlpService');
const taskService = require('../services/taskService');
const lineMessaging = require('../services/lineMessaging');
const todoCard = require('../flex/todoCard');
const { routeIntent } = require('./textHandler');

/**
 * จัดการข้อความเสียง (message type = 'audio')
 * ถอดเสียง -> ให้ AI วิเคราะห์ว่าเป็นนัดหมาย/To-Do/ถามสรุป -> ทำงานต่อทันที
 * (ตอบ reply แจ้งกำลังประมวลผลก่อน แล้ว push ผลลัพธ์ เพราะ Gemini ใช้เวลา)
 */
async function handleAudio(event) {
  const replyToken = event.replyToken;
  const userId = event.source?.userId;
  const messageId = event.message.id;

  await lineMessaging.reply(replyToken, '🎙️ กำลังถอดเสียงและวิเคราะห์...');

  try {
    const transcript = await voiceService.transcribeAudio(messageId);

    if (!transcript || transcript.length < 2) {
      await lineMessaging.push(userId, 'ไม่สามารถถอดข้อความจากเสียงได้ ลองอัดใหม่อีกครั้งนะครับ');
      return;
    }

    const result = await nlpService.classifyMessage(transcript);
    const heard = { type: 'text', text: `🎙️ ถอดเสียงได้ว่า:\n"${transcript}"` };

    let action;
    if (result.intent === 'other') {
      // ไม่ชัดว่าเป็นนัด/งาน → เก็บเป็น To-Do จากข้อความที่ถอดได้ (กันข้อมูลหาย)
      const task = await taskService.createTask({ userId, description: transcript, source: 'voice' });
      action = todoCard(task);
    } else {
      // นัดหมาย / To-Do / ถามสรุป → ใช้ตรรกะเดียวกับข้อความพิมพ์ (ระบุ source=voice)
      action = await routeIntent(userId, result, 'voice');
    }

    await lineMessaging.push(userId, [heard, action]);
  } catch (err) {
    console.error('[Audio] ถอดเสียงไม่สำเร็จ:', err.message);
    await lineMessaging.push(userId, `❌ ประมวลผลเสียงไม่สำเร็จ (${err.message})`);
  }
}

module.exports = {
  handleAudio
};
