'use strict';

const querystring = require('querystring');
const appointmentService = require('../services/appointmentService');
const taskService = require('../services/taskService');
const lineMessaging = require('../services/lineMessaging');
const appointmentCard = require('../flex/appointmentCard');
const { formatThaiDateTime } = require('../config/datetime');

/**
 * จัดการ postback (กดปุ่มบนการ์ด Flex)
 * รองรับ:
 *  - นัดหมาย: acknowledge | snooze | dismiss | confirm_appt | cancel_new | cancel_old  (appointmentId)
 *  - To-Do:   task_done  (taskId)
 */
async function handlePostback(event) {
  const replyToken = event.replyToken;
  const data = querystring.parse(event.postback?.data || '');
  const action = data.action;
  const apptId = data.appointmentId;
  const oldId = data.oldId;
  const taskId = data.taskId;

  try {
    if (action === 'acknowledge' && apptId) {
      const appt = await appointmentService.acknowledge(apptId);
      return lineMessaging.reply(
        replyToken,
        `✅ รับทราบนัดหมายแล้ว\n\n"${appt.title}"\n🕒 ${formatThaiDateTime(appt.date_time)}\n\nระบบจะหยุดเตือนซ้ำ และจะส่งเตือนรอบสุดท้ายอีกครั้ง 1 ชั่วโมงก่อนถึงเวลานัด`
      );
    }

    if (action === 'snooze' && apptId) {
      const appt = await appointmentService.snooze(apptId, 1);
      return lineMessaging.reply(
        replyToken,
        `⏰ เลื่อนการเตือนออกไป 1 ชั่วโมง\n\n"${appt.title}"\nจะเตือนคุณอีกครั้งในอีก 1 ชั่วโมงครับ`
      );
    }

    if (action === 'dismiss' && apptId) {
      const appt = await appointmentService.dismiss(apptId);
      return lineMessaging.reply(
        replyToken,
        `✖️ ปิดการเตือนนัดนี้แล้ว\n\n"${appt.title}"\nระบบจะไม่เตือนนัดนี้อีก (นัดยังอยู่ในระบบ)`
      );
    }

    // นัดซ้ำ: เก็บทั้งคู่
    if (action === 'confirm_appt' && apptId) {
      const appt = await appointmentService.confirmPending(apptId);
      return lineMessaging.reply(replyToken, appointmentCard(appt));
    }

    // นัดซ้ำ: ยกเลิกนัดใหม่ (เก็บนัดเดิม)
    if (action === 'cancel_new' && apptId) {
      await appointmentService.deleteAppointment(apptId);
      return lineMessaging.reply(replyToken, '🗑️ ยกเลิกนัดใหม่แล้ว — เก็บนัดเดิมไว้ตามเดิมครับ');
    }

    // นัดซ้ำ: ยกเลิกนัดเดิม แล้วใช้นัดใหม่แทน
    if (action === 'cancel_old' && apptId && oldId) {
      await appointmentService.deleteAppointment(oldId);
      const appt = await appointmentService.confirmPending(apptId);
      return lineMessaging.reply(replyToken, [
        { type: 'text', text: '♻️ ยกเลิกนัดเดิมแล้ว — บันทึกนัดใหม่แทนเรียบร้อย' },
        appointmentCard(appt)
      ]);
    }

    if (action === 'task_done' && taskId) {
      const task = await taskService.markDone(taskId);
      return lineMessaging.reply(replyToken, `✅ ทำงานเสร็จแล้ว\n\n"${task.task_description}"\nเยี่ยมมากครับ 🎉`);
    }

    // ยกเลิกนัดหมาย (จากเมนู /cancel)
    if (action === 'appt_cancel' && apptId) {
      await appointmentService.deleteAppointment(apptId);
      return lineMessaging.reply(replyToken, '🗑️ ยกเลิกนัดหมายเรียบร้อยแล้วครับ');
    }

    // ยกเลิก To-Do (จากเมนู /cancel)
    if (action === 'todo_cancel' && taskId) {
      await taskService.deleteTask(taskId);
      return lineMessaging.reply(replyToken, '🗑️ ยกเลิกงาน (To-Do) เรียบร้อยแล้วครับ');
    }
  } catch (err) {
    console.error(`[Postback] ${action} ล้มเหลว:`, err.message);
    return lineMessaging.reply(replyToken, '❌ อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้งครับ');
  }

  return lineMessaging.reply(replyToken, 'รับคำสั่งแล้วครับ');
}

module.exports = {
  handlePostback
};
