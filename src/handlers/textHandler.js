'use strict';

const nlpService = require('../services/nlpService');
const appointmentService = require('../services/appointmentService');
const calendarService = require('../services/calendarService');
const lineMessaging = require('../services/lineMessaging');
const appointmentCard = require('../flex/appointmentCard');

const HELP_TEXT = [
  '🤖 เลขาฯ ส่วนตัว PM — คำสั่งที่ใช้ได้',
  '',
  '• พิมพ์นัดหมายเป็นภาษาไทยทั่วไป เช่น',
  '   "ประชุมไซต์งานพรุ่งนี้บ่ายสองที่อาคาร A"',
  '   → ระบบจะบันทึก + ลง Google Calendar + เตือนล่วงหน้าให้',
  '',
  '• ส่งไฟล์ Word/Excel/PDF → สรุปเนื้อหาให้ภายในแชท',
  '• ส่งข้อความเสียง → บันทึกเป็น To-Do อัตโนมัติ',
  '• /whoami → ดู LINE userId ของคุณ (ใช้ตั้งค่า PM_LINE_USER_ID)',
  '• /help → แสดงเมนูนี้'
].join('\n');

/**
 * จัดการข้อความตัวอักษร
 * @param {Object} event - LINE message event (text)
 */
async function handleText(event) {
  const text = (event.message.text || '').trim();
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  // ---- คำสั่ง ----
  if (text.startsWith('/')) {
    const command = text.split(/\s+/)[0].toLowerCase();

    if (command === '/help' || command === '/start') {
      return lineMessaging.reply(replyToken, HELP_TEXT);
    }

    if (command === '/whoami') {
      return lineMessaging.reply(
        replyToken,
        `LINE userId ของคุณคือ:\n${userId}\n\nนำค่านี้ไปใส่ใน .env ที่ตัวแปร PM_LINE_USER_ID เพื่อรับการแจ้งเตือนอัตโนมัติ`
      );
    }

    return lineMessaging.reply(replyToken, `ไม่รู้จักคำสั่ง "${command}"\nพิมพ์ /help เพื่อดูคำสั่งทั้งหมด`);
  }

  // ---- ข้อความทั่วไป: พยายามสกัดเป็นนัดหมาย ----
  const extracted = await nlpService.extractAppointment(text);

  if (!extracted.is_appointment) {
    return lineMessaging.reply(
      replyToken,
      'รับข้อความแล้วครับ 👍\nหากต้องการให้บันทึกเป็นนัดหมาย ลองระบุวันเวลาให้ชัดเจน เช่น "ประชุมพรุ่งนี้ 10 โมงเช้าที่ออฟฟิศ"\n(พิมพ์ /help เพื่อดูคำสั่งทั้งหมด)'
    );
  }

  // บันทึกลง DB ก่อน
  const appt = await appointmentService.createAppointment({
    userId,
    title: extracted.title,
    dateTime: extracted.date_time,
    location: extracted.location
  });

  // พยายามลง Google Calendar (ไม่ให้ error ตรงนี้ทำให้ flow ล้ม)
  let calendarEventId = null;
  try {
    calendarEventId = await calendarService.createCalendarEvent({
      title: extracted.title,
      dateTime: extracted.date_time,
      location: extracted.location
    });
    if (calendarEventId) {
      await appointmentService.setCalendarEventId(appt.id, calendarEventId);
    }
  } catch (err) {
    console.error('[Calendar] บันทึกไม่สำเร็จ:', err.message);
  }

  return lineMessaging.reply(replyToken, appointmentCard(appt, Boolean(calendarEventId)));
}

module.exports = {
  handleText
};
