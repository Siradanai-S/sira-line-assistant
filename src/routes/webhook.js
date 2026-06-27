'use strict';

const express = require('express');
const { line, lineConfig } = require('../config/lineClient');
const { routeEvents } = require('../handlers/eventRouter');

const router = express.Router();

/**
 * POST /webhook
 * - line.middleware ตรวจสอบ X-Line-Signature อัตโนมัติ (กันปลอม request)
 * - ต้องไม่มี express.json() คั่นก่อนหน้า เพราะ middleware ต้องอ่าน raw body เอง
 * - ตอบ 200 ทันที แล้วประมวลผล event แบบ async (LINE กำหนดให้ตอบเร็ว)
 */
router.post('/', line.middleware(lineConfig), (req, res) => {
  const events = req.body.events || [];

  // ตอบ 200 กลับ LINE ทันที
  res.status(200).end();

  // ประมวลผล event แบบไม่บล็อก (ไม่ throw ออกไปทำให้ res ค้าง)
  routeEvents(events).catch((err) => {
    console.error('[Webhook] ประมวลผล events ล้มเหลว:', err.message);
  });
});

module.exports = router;
