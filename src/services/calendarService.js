'use strict';

const { getCalendarApi } = require('../config/googleCalendar');
const config = require('../config/env');
const { TZ, DateTime } = require('../config/datetime');

/**
 * เพิ่ม event ลงปฏิทินของ PM
 * @param {Object} appt - { title, dateTime (ISO), location }
 * @param {Number} durationMinutes - ความยาว event (ดีฟอลต์ 60 นาที)
 * @returns {String|null} eventId ถ้าสำเร็จ, null ถ้ายังไม่ได้ตั้งค่า/ผิดพลาด
 */
async function createCalendarEvent(appt, durationMinutes = 60) {
  if (!config.features.googleCalendar) {
    return null;
  }

  const calendar = getCalendarApi();
  const start = new Date(appt.dateTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const event = {
    summary: appt.title,
    location: appt.location || undefined,
    description: 'สร้างอัตโนมัติโดยเลขาฯ ส่วนตัว PM (LINE Bot)',
    start: { dateTime: start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 }
      ]
    }
  };

  const res = await calendar.events.insert({
    calendarId: config.google.calendarId,
    requestBody: event
  });

  return res.data.id || null;
}

/**
 * เพิ่ม To-Do ลงปฏิทินเป็น all-day event ในวันกำหนดส่ง
 * @param {Object} todo - { title, dueDate ('YYYY-MM-DD') }
 * @returns {String|null} eventId ถ้าสำเร็จ, null ถ้ายังไม่ได้ตั้งค่า/ไม่มีกำหนดส่ง
 */
async function createTodoEvent({ title, dueDate }) {
  if (!config.features.googleCalendar || !dueDate) {
    return null;
  }

  const calendar = getCalendarApi();
  // all-day event: end.date ต้องเป็นวันถัดไป (Google ใช้ end แบบ exclusive)
  const endDate = DateTime.fromISO(dueDate, { zone: TZ }).plus({ days: 1 }).toISODate();

  const event = {
    summary: `📋 ${title}`,
    description: 'To-Do สร้างอัตโนมัติโดยเลขาฯ ส่วนตัว PM (LINE Bot)',
    start: { date: dueDate },
    end: { date: endDate }
  };

  const res = await calendar.events.insert({
    calendarId: config.google.calendarId,
    requestBody: event
  });

  return res.data.id || null;
}

module.exports = {
  createCalendarEvent,
  createTodoEvent
};
