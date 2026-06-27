'use strict';

const querystring = require('querystring');
const appointmentService = require('../services/appointmentService');
const lineMessaging = require('../services/lineMessaging');
const { formatThaiDateTime } = require('../config/datetime');

/**
 * จัดการ postback (กดปุ่มบนการ์ด Flex)
 * รองรับ action=acknowledge&appointmentId=...
 */
async function handlePostback(event) {
  const replyToken = event.replyToken;
  const data = querystring.parse(event.postback?.data || '');

  if (data.action === 'acknowledge' && data.appointmentId) {
    try {
      const appt = await appointmentService.acknowledge(data.appointmentId);
      return lineMessaging.reply(
        replyToken,
        `✅ รับทราบนัดหมายแล้ว\n\n"${appt.title}"\n🕒 ${formatThaiDateTime(appt.date_time)}\n\nระบบจะหยุดเตือนซ้ำ และจะส่งเตือนรอบสุดท้ายอีกครั้ง 1 ชั่วโมงก่อนถึงเวลานัด`
      );
    } catch (err) {
      console.error('[Postback] acknowledge ล้มเหลว:', err.message);
      return lineMessaging.reply(replyToken, '❌ อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้งครับ');
    }
  }

  return lineMessaging.reply(replyToken, 'รับคำสั่งแล้วครับ');
}

module.exports = {
  handlePostback
};
