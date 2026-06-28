'use strict';

const querystring = require('querystring');
const appointmentService = require('../services/appointmentService');
const lineMessaging = require('../services/lineMessaging');
const { formatThaiDateTime } = require('../config/datetime');

/**
 * จัดการ postback (กดปุ่มบนการ์ด Flex)
 * รองรับ: action=acknowledge | snooze | dismiss  (พร้อม appointmentId)
 */
async function handlePostback(event) {
  const replyToken = event.replyToken;
  const data = querystring.parse(event.postback?.data || '');
  const id = data.appointmentId;

  if (!id) {
    return lineMessaging.reply(replyToken, 'รับคำสั่งแล้วครับ');
  }

  try {
    if (data.action === 'acknowledge') {
      const appt = await appointmentService.acknowledge(id);
      return lineMessaging.reply(
        replyToken,
        `✅ รับทราบนัดหมายแล้ว\n\n"${appt.title}"\n🕒 ${formatThaiDateTime(appt.date_time)}\n\nระบบจะหยุดเตือนซ้ำ และจะส่งเตือนรอบสุดท้ายอีกครั้ง 1 ชั่วโมงก่อนถึงเวลานัด`
      );
    }

    if (data.action === 'snooze') {
      const appt = await appointmentService.snooze(id, 1);
      return lineMessaging.reply(
        replyToken,
        `⏰ เลื่อนการเตือนออกไป 1 ชั่วโมง\n\n"${appt.title}"\nจะเตือนคุณอีกครั้งในอีก 1 ชั่วโมงครับ`
      );
    }

    if (data.action === 'dismiss') {
      const appt = await appointmentService.dismiss(id);
      return lineMessaging.reply(
        replyToken,
        `✖️ ปิดการเตือนนัดนี้แล้ว\n\n"${appt.title}"\nระบบจะไม่เตือนนัดนี้อีก (นัดยังอยู่ในระบบ)`
      );
    }
  } catch (err) {
    console.error(`[Postback] ${data.action} ล้มเหลว:`, err.message);
    return lineMessaging.reply(replyToken, '❌ อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้งครับ');
  }

  return lineMessaging.reply(replyToken, 'รับคำสั่งแล้วครับ');
}

module.exports = {
  handlePostback
};
