'use strict';

const genAI = require('../config/gemini');
const config = require('../config/env');
const { downloadContent } = require('./fileService');

/**
 * แปลงไฟล์เสียงจาก LINE เป็นข้อความภาษาไทยด้วย Gemini (multimodal audio)
 * LINE ส่งไฟล์เสียงมาเป็น m4a (audio/mp4) ซึ่ง Gemini รองรับโดยตรง
 * @param {String} messageId - id ของ audio message
 * @returns {String} ข้อความที่ถอดได้
 */
async function transcribeAudio(messageId) {
  const buffer = await downloadContent(messageId);
  const base64Audio = buffer.toString('base64');

  const response = await genAI.models.generateContent({
    model: config.gemini.model,
    contents: [
      {
        inlineData: {
          mimeType: config.gemini.audioMime,
          data: base64Audio
        }
      },
      {
        text: 'ถอดเสียงพูดภาษาไทยในไฟล์นี้เป็นข้อความ ตอบกลับเฉพาะข้อความที่ถอดได้เท่านั้น ห้ามมีคำอธิบายอื่น'
      }
    ],
    config: {
      temperature: 0
    }
  });

  return (response.text || '').trim();
}

module.exports = {
  transcribeAudio
};
