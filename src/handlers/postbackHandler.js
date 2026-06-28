'use strict';

const querystring = require('querystring');
const appointmentService = require('../services/appointmentService');
const taskService = require('../services/taskService');
const lineMessaging = require('../services/lineMessaging');
const { finalizeAppointment } = require('./textHandler');
const { formatThaiDateTime } = require('../config/datetime');

/**
 * จัดการ postback (กดปุ่มบนการ์ด Flex)
 * รองรับ:
 *  - นัดหมาย: acknowledge | snooze | dismiss | confirm_appt | cancel_appt  (appointmentId)
 *  - To-Do:   task_done  (taskId)
 */
async function handlePostback(event) {
  const replyToken = event.replyToken;
  const data = querystring.parse(event.postback?.data || '');
  const action = data.action;
  const apptId = data.appointmentId;
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

    if (action === 'confirm_appt' && apptId) {
      const appt = await appointmentService.confirmPending(apptId);
      // ยืนยันแล้วค่อย sync calendar + ตอบการ์ดสรุป (เหมือน path ปกติ)
      return lineMessaging.reply(replyToken, await finalizeAppointment(appt));
    }

    if (action === 'cancel_appt' && apptId) {
      await appointmentService.deleteAppointment(apptId);
      return lineMessaging.reply(replyToken, '✖️ ยกเลิกนัดใหม่แล้ว (ไม่บันทึกซ้อนเวลาเดิม)');
    }

    if (action === 'task_done' && taskId) {
      const task = await taskService.markDone(taskId);
      return lineMessaging.reply(replyToken, `✅ ทำงานเสร็จแล้ว\n\n"${task.task_description}"\nเยี่ยมมากครับ 🎉`);
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
