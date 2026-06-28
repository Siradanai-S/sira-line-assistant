'use strict';

const genAI = require('../config/gemini');
const config = require('../config/env');
const { now, TZ } = require('../config/datetime');

/**
 * จำแนกเจตนาของข้อความภาษาไทย (ใช้ Gemini) แล้วดึงรายละเอียดออกมา
 * คืนค่า: { intent, title, date_time, location, due_date, confidence }
 *  - intent = 'appointment' (มีวัน+เวลานัดชัด) | 'todo' (งานที่ต้องทำ/มีเดดไลน์) | 'other'
 *  - ส่งเวลาปัจจุบัน + timezone เข้าไปด้วย เพื่อแปลงคำสัมพัทธ์ (พรุ่งนี้/ศุกร์หน้า/สิ้นเดือน) ได้ถูกต้อง
 */
async function classifyMessage(text) {
  const current = now();
  const systemInstruction = [
    'คุณคือระบบจำแนกเจตนา (Intent Classification) + สกัดข้อมูล (Information Extraction) ที่แม่นยำมาก',
    'อ่านข้อความภาษาไทยของผู้ใช้ แล้วจัดประเภทเป็นหนึ่งใน:',
    '  • "appointment" = การนัดหมาย/ประชุม/กำหนดการ ที่มี "เวลานัด" ชัดเจน (เช่น ประชุม 10 โมง, เจอลูกค้าบ่ายสอง)',
    '  • "todo" = งานที่ต้องทำ/สิ่งที่ต้องส่ง/ภารกิจ ที่อาจมี "กำหนดส่ง (เดดไลน์)" แต่ไม่ใช่การนัดเจอตามเวลา (เช่น ส่งรายงานภายในศุกร์นี้, ซื้อของ, โทรหาผู้รับเหมา)',
    '  • "query" = การ "ถาม/ขอสรุป" แผนงาน นัดหมาย หรือ To-Do ของวันใดวันหนึ่ง (เช่น "สรุปแผนงานวันที่ 3 กรกฎาคม", "พรุ่งนี้มีนัดอะไรบ้าง", "วันนี้ต้องทำอะไร")',
    '  • "other" = ข้อความทั่วไปที่ไม่ใช่ข้างต้น',
    '',
    `เวลาปัจจุบันคือ ${current.toISO()} (timezone ${TZ})`,
    'ให้แปลงคำบอกเวลาแบบสัมพัทธ์ (พรุ่งนี้, มะรืน, บ่ายสองโมง, วันศุกร์หน้า, สิ้นเดือน) เป็นวันเวลาที่ชัดเจน',
    'ปีพุทธศักราช (เช่น 2569 หรือ 69) ให้แปลงเป็น ค.ศ. (2569 = 2026) ก่อนคำนวณวันที่',
    'สำหรับ appointment: ถ้าระบุเฉพาะวันแต่ไม่ระบุเวลา ให้สมมติเวลา 09:00 น.',
    'สำหรับ todo: ถ้าไม่มีกำหนดส่ง ให้ due_date เป็น "" ได้',
    'สำหรับ query: ใส่วันที่ที่ผู้ใช้ถามถึงใน query_date (ถ้าไม่ระบุวัน ให้ถือว่าเป็นวันนี้)',
    '',
    'ตอบกลับเป็น JSON object เท่านั้น ตามสคีมานี้:',
    '{',
    '  "intent": "appointment" | "todo" | "query" | "other",',
    '  "title": string,                 // เรื่อง/หัวข้อสั้น กระชับ',
    '  "date_time": string,             // (เฉพาะ appointment) ISO 8601 พร้อม offset เช่น "2026-06-28T15:00:00+07:00" ไม่มีให้ใส่ ""',
    '  "location": string,              // สถานที่ ถ้ามี ไม่มีให้ใส่ ""',
    '  "due_date": string,              // (เฉพาะ todo) กำหนดส่งรูปแบบ "YYYY-MM-DD" ไม่มีให้ใส่ ""',
    '  "query_date": string,            // (เฉพาะ query) วันที่ถามถึงรูปแบบ "YYYY-MM-DD" ไม่ระบุให้ใส่ ""',
    '  "confidence": number             // 0.0 - 1.0',
    '}'
  ].join('\n');

  let parsed;
  try {
    const response = await genAI.models.generateContent({
      model: config.gemini.model,
      contents: text,
      config: {
        systemInstruction,
        temperature: 0,
        responseMimeType: 'application/json'
      }
    });
    parsed = JSON.parse((response.text || '').trim());
  } catch (err) {
    console.warn('[NLP] จำแนก/parse ไม่สำเร็จ:', err.message);
    parsed = { intent: 'other' };
  }

  const dateTime = parsed.date_time && String(parsed.date_time).trim() !== '' ? String(parsed.date_time).trim() : null;
  const dueDate = parsed.due_date && String(parsed.due_date).trim() !== '' ? String(parsed.due_date).trim() : null;
  const queryDate = parsed.query_date && String(parsed.query_date).trim() !== '' ? String(parsed.query_date).trim() : null;
  const location = parsed.location && String(parsed.location).trim() !== '' ? String(parsed.location).trim() : null;

  let intent = ['appointment', 'todo', 'query', 'other'].includes(parsed.intent) ? parsed.intent : 'other';
  // appointment ต้องมีเวลานัดจริง มิฉะนั้นตกเป็น other
  if (intent === 'appointment' && !dateTime) intent = 'other';

  return {
    intent,
    title: parsed.title || (intent === 'todo' ? 'งานที่ต้องทำ' : 'นัดหมาย'),
    date_time: dateTime,
    location,
    due_date: dueDate,
    query_date: queryDate,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0
  };
}

module.exports = {
  classifyMessage
};
