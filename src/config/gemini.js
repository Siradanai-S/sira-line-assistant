'use strict';

const { GoogleGenAI } = require('@google/genai');
const config = require('./env');

/**
 * Google GenAI client (ฟรี tier — ไม่ต้องใช้บัตรเครดิต)
 * ใช้ตัวเดียวทำได้ทั้ง: สกัดนัดหมาย, สรุปไฟล์, และถอดเสียง (multimodal)
 */
const genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });

module.exports = genAI;
