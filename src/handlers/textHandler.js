'use strict';

const nlpService = require('../services/nlpService');
const appointmentService = require('../services/appointmentService');
const taskService = require('../services/taskService');
const calendarService = require('../services/calendarService');
const lineMessaging = require('../services/lineMessaging');
const appointmentCard = require('../flex/appointmentCard');
const conflictCard = require('../flex/conflictCard');
const todoCard = require('../flex/todoCard');

const HELP_TEXT = [
  '🤖 เลขาฯ ส่วนตัว PM — คำสั่งที่ใช้ได้',
  '',
  '• พิมพ์นัดหมายเป็นภาษาไทยทั่วไป เช่น',
  '   "ประชุมไซต์งานพรุ่งนี้บ่ายสองที่อาคาร A"',
  '   → บันทึก + ลง Google Calendar + เตือนล่วงหน้าให้',
  '',
  '• พิมพ์งานที่ต้องทำ เช่น "ส่งรายงานภายในศุกร์นี้"',
  '   → ระบบจะบันทึกเป็น To-Do และเตือนเมื่อถึงกำหนด',
  '',
  '• ส่งไฟล์ Word/Excel/PDF → สรุปเนื้อหาให้ภายในแชท',
  '• ส่งข้อความเสียง → บันทึกเป็น To-Do อัตโนมัติ',
  '• /whoami → ดู LINE userId ของคุณ',
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

  // ---- ข้อความทั่วไป: ให้ AI จำแนกเจตนา ----
  const result = await nlpService.classifyMessage(text);

  if (result.intent === 'appointment') {
    return handleAppointment(event, result);
  }

  if (result.intent === 'todo') {
    return handleTodo(event, result);
  }

  // intent === 'other'
  return lineMessaging.reply(
    replyToken,
    'รับข้อความแล้วครับ 👍\nหากต้องการบันทึกนัดหมาย ลองระบุวันเวลาให้ชัด เช่น "ประชุมพรุ่งนี้ 10 โมงเช้าที่ออฟฟิศ"\nหรือบันทึกงาน เช่น "ส่งรายงานภายในศุกร์นี้"\n(พิมพ์ /help เพื่อดูคำสั่งทั้งหมด)'
  );
}

/** จัดการ intent = appointment (มีเช็คนัดซ้ำเวลาเดียวกัน) */
async function handleAppointment(event, extracted) {
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  // เช็คนัดซ้ำ วัน+เวลาเดียวกัน
  const conflict = await appointmentService.findConflict(extracted.date_time);

  if (conflict) {
    // บันทึกแบบรอยืนยัน (ยังไม่เตือน/ไม่ลง calendar จนกว่าจะกดยืนยัน)
    const pending = await appointmentService.createAppointment({
      userId,
      title: extracted.title,
      dateTime: extracted.date_time,
      location: extracted.location,
      pendingConfirm: true
    });
    return lineMessaging.reply(replyToken, conflictCard(pending, conflict));
  }

  const appt = await appointmentService.createAppointment({
    userId,
    title: extracted.title,
    dateTime: extracted.date_time,
    location: extracted.location
  });

  return lineMessaging.reply(replyToken, await finalizeAppointment(appt));
}

/**
 * sync Google Calendar ให้นัดที่ยืนยันแล้ว แล้วคืนการ์ดสรุป
 * ใช้ทั้ง path ไม่ซ้ำ และตอนกดยืนยันนัดซ้อนใน postback
 * @param {Object} appt - แถวนัดจาก DB { id, title, date_time, location }
 */
async function finalizeAppointment(appt) {
  let calendarEventId = null;
  try {
    calendarEventId = await calendarService.createCalendarEvent({
      title: appt.title,
      dateTime: appt.date_time,
      location: appt.location
    });
    if (calendarEventId) {
      await appointmentService.setCalendarEventId(appt.id, calendarEventId);
    }
  } catch (err) {
    console.error('[Calendar] บันทึกนัดไม่สำเร็จ:', err.message);
  }
  return appointmentCard(appt, Boolean(calendarEventId));
}

/** จัดการ intent = todo (บันทึกงาน + sync calendar all-day ถ้ามีกำหนดส่ง) */
async function handleTodo(event, extracted) {
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  const task = await taskService.createTask({
    userId,
    description: extracted.title,
    source: 'text',
    dueDate: extracted.due_date
  });

  let calendarEventId = null;
  try {
    calendarEventId = await calendarService.createTodoEvent({
      title: task.task_description,
      dueDate: task.due_date
    });
    if (calendarEventId) {
      await taskService.setCalendarEventId(task.id, calendarEventId);
    }
  } catch (err) {
    console.error('[Calendar] บันทึก To-Do ไม่สำเร็จ:', err.message);
  }

  return lineMessaging.reply(replyToken, todoCard(task, Boolean(calendarEventId)));
}

module.exports = {
  handleText,
  finalizeAppointment
};
