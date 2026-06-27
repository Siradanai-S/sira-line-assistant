'use strict';

const { DateTime } = require('luxon');
const config = require('./env');

const TZ = config.server.timezone || 'Asia/Bangkok';

const TH_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/** แปลง ISO/Date เป็นข้อความวันที่+เวลาภาษาไทย เช่น "27 มิ.ย. 2569 14:30 น." */
function formatThaiDateTime(isoOrDate) {
  const dt = DateTime.fromISO(toIso(isoOrDate), { zone: TZ });
  if (!dt.isValid) return String(isoOrDate);
  const buddhistYear = dt.year + 543;
  return `${dt.day} ${TH_MONTHS[dt.month - 1]} ${buddhistYear} ${dt.toFormat('HH:mm')} น.`;
}

/** แปลงเป็นข้อความวันที่ล้วน เช่น "27 มิ.ย. 2569" */
function formatThaiDate(isoOrDate) {
  const dt = DateTime.fromISO(toIso(isoOrDate), { zone: TZ });
  if (!dt.isValid) return String(isoOrDate);
  const buddhistYear = dt.year + 543;
  return `${dt.day} ${TH_MONTHS[dt.month - 1]} ${buddhistYear}`;
}

/** จำนวนวันคงเหลือจากวันนี้ถึงวันที่กำหนด (ปัดเป็นจำนวนวันเต็ม) */
function daysUntil(isoOrDate) {
  const target = DateTime.fromISO(toIso(isoOrDate), { zone: TZ }).startOf('day');
  const today = DateTime.now().setZone(TZ).startOf('day');
  return Math.round(target.diff(today, 'days').days);
}

/** เวลาปัจจุบันใน timezone ที่กำหนด (Luxon DateTime) */
function now() {
  return DateTime.now().setZone(TZ);
}

function toIso(isoOrDate) {
  if (isoOrDate instanceof Date) return isoOrDate.toISOString();
  return String(isoOrDate);
}

module.exports = {
  TZ,
  formatThaiDateTime,
  formatThaiDate,
  daysUntil,
  now,
  DateTime
};
