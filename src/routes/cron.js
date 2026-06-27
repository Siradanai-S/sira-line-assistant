'use strict';

const express = require('express');
const config = require('../config/env');
const reminderEngine = require('../cron/reminderEngine');
const dailyReport = require('../cron/dailyReport');

const router = express.Router();

/**
 * ตรวจ secret ของ cron (รับได้ทั้ง header X-Cron-Secret หรือ query ?key=)
 * ใช้ป้องกันไม่ให้คนนอกยิง endpoint เรียกงานเตือน/รายงานมั่ว
 */
function checkSecret(req, res, next) {
  if (!config.features.httpCron) {
    return res.status(404).json({ error: 'cron endpoints ถูกปิด (ยังไม่ได้ตั้ง CRON_SECRET)' });
  }
  const provided = req.get('X-Cron-Secret') || req.query.key;
  if (!provided || provided !== config.cron.secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

/**
 * POST/GET /cron/reminders
 * ให้ตัวจับเวลาภายนอก (เช่น cron-job.org) เรียกทุก 1 ชั่วโมง
 */
router.all('/reminders', checkSecret, async (req, res) => {
  try {
    await reminderEngine.runReminderCheck();
    res.json({ ok: true, job: 'reminders', at: new Date().toISOString() });
  } catch (err) {
    console.error('[CronHTTP] reminders ล้มเหลว:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST/GET /cron/daily
 * ให้ตัวจับเวลาภายนอกเรียกวันละครั้ง เวลา 06:00 (ตั้งเวลาฝั่ง cron-job.org)
 */
router.all('/daily', checkSecret, async (req, res) => {
  try {
    await dailyReport.runDailyReport();
    res.json({ ok: true, job: 'daily', at: new Date().toISOString() });
  } catch (err) {
    console.error('[CronHTTP] daily ล้มเหลว:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /cron/ping
 * endpoint เบา ๆ ให้ใช้ ping กันแอปหลับ (ไม่ต้องใช้ secret)
 */
router.get('/ping', (req, res) => {
  res.json({ ok: true, pong: new Date().toISOString() });
});

module.exports = router;
