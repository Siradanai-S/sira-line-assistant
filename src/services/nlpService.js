'use strict';

const genAI = require('../config/gemini');
const config = require('../config/env');
const { now, TZ } = require('../config/datetime');

/**
 * สกัดข้อมูลนัดหมายจากข้อความภาษาไทยทั่วไป (ใช้ Gemini)
 * คืนค่า: { is_appointment, title, date_time (ISO 8601 พร้อม offset), location, confidence }
 * - ใช้ responseMimeType=application/json เพื่อให้ผลลัพธ์เป็น JSON เสมอ
 * - ส่งเวลาปัจจุบัน + timezone เข้าไปด้วย เพื่อให้แปลงคำว่า "พรุ่งนี้/บ่ายสาม/วันศุกร์หน้า" ได้ถูกต้อง
 */
async function extractAppointment(text) {
  const current = now();
  const systemInstruction = [
    'คุณคือระบบสกัดข้อมูลนัดหมาย (Information Extraction) ที่แม่นยำมาก',
    'หน้าที่: อ่านข้อความภาษาไทย แล้วระบุว่าเป็น "การนัดหมาย/ประชุม/กำหนดการ" หรือไม่ และดึงรายละเอียดออกมา',
    '',
    `เวลาปัจจุบันคือ ${current.toISO()} (timezone ${TZ})`,
    'ให้แปลงคำบอกเวลาแบบสัมพัทธ์ (เช่น พรุ่งนี้, มะรืน, บ่ายสองโมง, วันศุกร์หน้า, สิ้นเดือน) เป็นวันเวลาที่ชัดเจน',
    'ถ้าผู้ใช้ไม่ได้ระบุเวลาที่ชัดเจน แต่ระบุเฉพาะวัน ให้สมมติเวลา 09:00 น.',
    '',
    'ตอบกลับเป็น JSON object เท่านั้น ตามสคีมานี้:',
    '{',
    '  "is_appointment": boolean,            // true ถ้าข้อความสื่อถึงการนัด/ประชุม/กำหนดการที่มีเวลา',
    '  "title": string,                      // หัวข้อสั้น กระชับ เช่น "ประชุมไซต์ก่อสร้าง"',
    '  "date_time": string,                  // ISO 8601 พร้อม offset เช่น "2026-06-28T15:00:00+07:00" (ถ้าไม่มีให้ใส่ "")',
    '  "location": string,                   // สถานที่ ถ้ามี (ถ้าไม่มีให้ใส่ "")',
    '  "confidence": number                  // 0.0 - 1.0 ความมั่นใจ',
    '}'
  ].join('\n');

  const response = await genAI.models.generateContent({
    model: config.gemini.model,
    contents: text,
    config: {
      systemInstruction,
      temperature: 0,
      responseMimeType: 'application/json'
    }
  });

  const raw = (response.text || '').trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    parsed = { is_appointment: false };
  }

  const dateTime = parsed.date_time && String(parsed.date_time).trim() !== '' ? parsed.date_time : null;

  return {
    is_appointment: Boolean(parsed.is_appointment) && Boolean(dateTime),
    title: parsed.title || 'นัดหมาย',
    date_time: dateTime,
    location: parsed.location && String(parsed.location).trim() !== '' ? parsed.location : null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0
  };
}

module.exports = {
  extractAppointment
};
