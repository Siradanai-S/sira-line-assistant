'use strict';

const nlpService = require('../services/nlpService');
const appointmentService = require('../services/appointmentService');
const taskService = require('../services/taskService');
const lineMessaging = require('../services/lineMessaging');
const appointmentCard = require('../flex/appointmentCard');
const conflictCard = require('../flex/conflictCard');
const todoCard = require('../flex/todoCard');
const cancelListCard = require('../flex/cancelListCard');
const { DateTime, TZ, formatThaiDate } = require('../config/datetime');

const HELP_TEXT = [
  '🤖 เลขาฯ ส่วนตัว PM — คำสั่งที่ใช้ได้',
  '',
  '• พิมพ์นัดหมายเป็นภาษาไทยทั่วไป เช่น',
  '   "ประชุมไซต์งานพรุ่งนี้บ่ายสองที่อาคาร A"',
  '   → บันทึก + เตือนล่วงหน้าให้',
  '',
  '• พิมพ์งานที่ต้องทำ เช่น "ส่งรายงานภายในศุกร์นี้"',
  '   → ระบบจะบันทึกเป็น To-Do และเตือนเมื่อถึงกำหนด',
  '',
  '• ถามสรุปแผนงาน เช่น "สรุปแผนงานวันที่ 3 กรกฎาคม"',
  '   → ระบบจะรวมนัดหมาย + To-Do ของวันนั้นให้',
  '',
  '• ส่งไฟล์ Word/Excel/PDF → สรุปเนื้อหาให้ภายในแชท',
  '• ส่งข้อความเสียง → AI วิเคราะห์เป็นนัดหมาย/To-Do แล้วบันทึกให้ทันที',
  '• /cancel → แสดงรายการนัด/To-Do เพื่อกดยกเลิก',
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

    if (command === '/cancel' || command === '/list') {
      return handleCancelList(replyToken);
    }

    return lineMessaging.reply(replyToken, `ไม่รู้จักคำสั่ง "${command}"\nพิมพ์ /help เพื่อดูคำสั่งทั้งหมด`);
  }

  // ---- ข้อความทั่วไป: ให้ AI จำแนกเจตนา ----
  const result = await nlpService.classifyMessage(text);
  const message = await routeIntent(userId, result);
  return lineMessaging.reply(replyToken, message);
}

/**
 * จำแนกผลลัพธ์ intent แล้วทำงาน + คืน "ข้อความที่จะส่งกลับ" (ไม่ผูกกับ replyToken)
 * ใช้ร่วมกันทั้งข้อความพิมพ์ (reply) และข้อความเสียง (push)
 * @param {String} userId
 * @param {Object} result - ผลจาก nlpService.classifyMessage
 * @param {String} source - 'text' | 'voice' (ที่มาของ To-Do)
 */
async function routeIntent(userId, result, source = 'text') {
  if (result.intent === 'appointment') {
    return processAppointment(userId, result);
  }
  if (result.intent === 'todo') {
    return processTodo(userId, result, source);
  }
  if (result.intent === 'query') {
    return processQuery(result);
  }
  // intent === 'other'
  return 'รับข้อความแล้วครับ 👍\nหากต้องการบันทึกนัดหมาย ลองระบุวันเวลาให้ชัด เช่น "ประชุมพรุ่งนี้ 10 โมงเช้าที่ออฟฟิศ"\nบันทึกงาน เช่น "ส่งรายงานภายในศุกร์นี้"\nหรือถามสรุป เช่น "สรุปแผนงานวันที่ 3 กรกฎาคม"';
}

/** intent = appointment (เช็คนัดซ้ำเวลาเดียวกัน) — คืน message */
async function processAppointment(userId, extracted) {
  const conflict = await appointmentService.findConflict(extracted.date_time);

  if (conflict) {
    // บันทึกแบบรอยืนยัน (ยังไม่เตือนจนกว่าจะกดยืนยัน)
    const pending = await appointmentService.createAppointment({
      userId,
      title: extracted.title,
      dateTime: extracted.date_time,
      location: extracted.location,
      pendingConfirm: true
    });
    return conflictCard(pending, conflict);
  }

  const appt = await appointmentService.createAppointment({
    userId,
    title: extracted.title,
    dateTime: extracted.date_time,
    location: extracted.location
  });

  return appointmentCard(appt);
}

/** intent = todo (บันทึกงาน + กำหนดส่ง) — คืน message */
async function processTodo(userId, extracted, source = 'text') {
  const task = await taskService.createTask({
    userId,
    description: extracted.title,
    source,
    dueDate: extracted.due_date
  });

  return todoCard(task);
}

/** intent = query (สรุปแผนงานของวันที่ระบุ) — คืน message */
async function processQuery(result) {
  const date = result.query_date || DateTime.now().setZone(TZ).toISODate();

  const [appointments, tasks] = await Promise.all([
    appointmentService.findByDate(date),
    taskService.findByDueDate(date)
  ]);

  return buildScheduleSummary(date, appointments, tasks);
}

/** /cancel — แสดงรายการนัด + To-Do ที่ค้างอยู่ ให้กดยกเลิกรายรายการ */
async function handleCancelList(replyToken) {
  const [appointments, tasks] = await Promise.all([
    appointmentService.findUpcoming(),
    taskService.findPending()
  ]);

  if (appointments.length === 0 && tasks.length === 0) {
    return lineMessaging.reply(replyToken, 'ไม่มีนัดหมายหรือ To-Do ที่ค้างอยู่ให้ยกเลิกครับ 👍');
  }

  return lineMessaging.reply(replyToken, cancelListCard(appointments, tasks));
}

/** สร้างข้อความสรุปแผนงานของวันที่กำหนด */
function buildScheduleSummary(dateIso, appointments, tasks) {
  const lines = [`📋 สรุปแผนงาน วันที่ ${formatThaiDate(dateIso)}`, ''];

  lines.push(`🗓️ นัดหมาย (${appointments.length})`);
  if (appointments.length > 0) {
    appointments.forEach((a) => {
      const time = DateTime.fromISO(a.date_time, { zone: TZ }).toFormat('HH:mm');
      lines.push(`• ${time} ${a.title}${a.location ? ' @ ' + a.location : ''}`);
    });
  } else {
    lines.push('— ไม่มีนัดหมาย —');
  }

  lines.push('');
  lines.push(`✅ To-Do ถึงกำหนด (${tasks.length})`);
  if (tasks.length > 0) {
    tasks.forEach((t) => {
      const done = t.status === 'Done' ? ' ✓' : '';
      lines.push(`• ${t.task_description}${done}`);
    });
  } else {
    lines.push('— ไม่มีงานถึงกำหนด —');
  }

  return lines.join('\n');
}

module.exports = {
  handleText,
  routeIntent
};
