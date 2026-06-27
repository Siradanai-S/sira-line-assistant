'use strict';

const cron = require('node-cron');
const appointmentService = require('../services/appointmentService');
const lineMessaging = require('../services/lineMessaging');
const reminderCard = require('../flex/reminderCard');
const config = require('../config/env');
const { TZ } = require('../config/datetime');

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** เลือกปลายทาง push: ผู้สร้างนัด (ถ้ามี) มิฉะนั้นใช้ PM กลาง */
async function pushTo(appt, message) {
  if (appt.user_id) {
    return lineMessaging.push(appt.user_id, message);
  }
  return lineMessaging.pushToPM(message);
}

/**
 * ตรรกะหลักของ Reminder Engine — เรียกทุก 1 ชั่วโมง
 * 1) นัดที่เหลือ < 24 ชม. และยังไม่รับทราบ:
 *    - ถ้ายังไม่เคยเตือน  -> ส่งเตือนรอบแรก (first24)
 *    - ถ้าเตือนล่าสุดเกิน 6 ชม. -> ส่งเตือนซ้ำ (repeat6)
 * 2) นัดที่รับทราบแล้ว เหลือ <= 1 ชม. และยังไม่ส่ง Final -> ส่งเตือนรอบสุดท้าย (final1)
 */
async function runReminderCheck() {
  const startedAt = new Date().toISOString();
  console.log(`[ReminderEngine] เริ่มตรวจรอบเวลา ${startedAt}`);

  // ---- ด่าน 1: เตือน 24 ชม. + loop 6 ชม. ----
  try {
    const pending = await appointmentService.findPendingWithin24h();
    for (const appt of pending) {
      const lastAt = appt.last_reminder_at ? new Date(appt.last_reminder_at).getTime() : null;
      const elapsed = lastAt === null ? Infinity : Date.now() - lastAt;

      if (lastAt === null) {
        await pushTo(appt, reminderCard(appt, 'first24'));
        await appointmentService.touchReminder(appt.id);
        console.log(`[ReminderEngine] ส่งเตือนรอบแรก: ${appt.title}`);
      } else if (elapsed >= SIX_HOURS_MS) {
        await pushTo(appt, reminderCard(appt, 'repeat6'));
        await appointmentService.touchReminder(appt.id);
        console.log(`[ReminderEngine] ส่งเตือนซ้ำ (6 ชม.): ${appt.title}`);
      }
    }
  } catch (err) {
    console.error('[ReminderEngine] ด่าน 24ชม./6ชม. ล้มเหลว:', err.message);
  }

  // ---- ด่าน 2: เตือนรอบสุดท้าย 1 ชม. ----
  try {
    const finals = await appointmentService.findAcknowledgedWithin1h();
    for (const appt of finals) {
      await pushTo(appt, reminderCard(appt, 'final1'));
      await appointmentService.markFinalSent(appt.id);
      console.log(`[ReminderEngine] ส่งเตือนรอบสุดท้าย: ${appt.title}`);
    }
  } catch (err) {
    console.error('[ReminderEngine] ด่าน 1ชม. ล้มเหลว:', err.message);
  }
}

/** ตั้ง schedule ให้รันทุกต้นชั่วโมง */
function start() {
  if (!config.cron.enableReminder) {
    console.log('[ReminderEngine] ปิดใช้งาน (ENABLE_REMINDER_CRON=false)');
    return;
  }
  // ทุกต้นชั่วโมง (นาทีที่ 0)
  cron.schedule('0 * * * *', runReminderCheck, { timezone: TZ });
  console.log('[ReminderEngine] ตั้งเวลาแล้ว — ทำงานทุกต้นชั่วโมง');
}

module.exports = {
  start,
  runReminderCheck
};
