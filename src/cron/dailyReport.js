'use strict';

const cron = require('node-cron');
const weatherService = require('../services/weatherService');
const appointmentService = require('../services/appointmentService');
const taskService = require('../services/taskService');
const lineMessaging = require('../services/lineMessaging');
const dailyDashboard = require('../flex/dailyDashboard');
const config = require('../config/env');
const { TZ } = require('../config/datetime');

/** ประกอบและส่งการ์ดสรุปงานยามเช้า */
async function runDailyReport() {
  console.log('[DailyReport] เริ่มสร้างรายงานเช้า');
  try {
    const [weather, appointments, tasks] = await Promise.all([
      safe(() => weatherService.getWeather(), null),
      safe(() => appointmentService.findToday(), []),
      safe(() => taskService.findDueAndOverdue(), [])
    ]);

    const card = dailyDashboard({
      weather,
      appointments,
      tasks,
      cityName: config.weather.cityName
    });

    await lineMessaging.pushToPM(card);
    console.log('[DailyReport] ส่งรายงานเช้าสำเร็จ');
  } catch (err) {
    console.error('[DailyReport] ล้มเหลว:', err.message);
  }
}

/** helper: เรียกฟังก์ชัน async แบบไม่ให้ throw (คืน fallback แทน) */
async function safe(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.error('[DailyReport] ดึงข้อมูลส่วนหนึ่งล้มเหลว:', err.message);
    return fallback;
  }
}

/** ตั้ง schedule ทุกวัน 06:00 น. */
function start() {
  if (!config.cron.enableDailyReport) {
    console.log('[DailyReport] ปิดใช้งาน (ENABLE_DAILY_REPORT_CRON=false)');
    return;
  }
  cron.schedule('0 6 * * *', runDailyReport, { timezone: TZ });
  console.log('[DailyReport] ตั้งเวลาแล้ว — ทุกวัน 06:00 น.');
}

module.exports = {
  start,
  runDailyReport
};
