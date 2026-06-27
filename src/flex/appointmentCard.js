'use strict';

const { formatThaiDateTime } = require('../config/datetime');

/**
 * การ์ดสรุปการนัดหมายที่บันทึกสำเร็จ
 * @param {Object} appt - { title, date_time, location }
 * @param {Boolean} savedToCalendar - บันทึกลง Google Calendar สำเร็จหรือไม่
 */
function appointmentCard(appt, savedToCalendar) {
  return {
    type: 'flex',
    altText: `บันทึกนัดหมาย: ${appt.title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1F6FEB',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: '🗓️ บันทึกนัดหมายสำเร็จ', color: '#FFFFFF', weight: 'bold', size: 'lg' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          row('หัวข้อ', appt.title),
          row('เวลา', formatThaiDateTime(appt.date_time)),
          row('สถานที่', appt.location || '-'),
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            margin: 'md',
            wrap: true,
            size: 'sm',
            color: savedToCalendar ? '#1A7F37' : '#9A6700',
            text: savedToCalendar
              ? '✅ เพิ่มลง Google Calendar แล้ว'
              : 'ℹ️ ยังไม่ได้เชื่อม Google Calendar (บันทึกในระบบเรียบร้อย)'
          },
          {
            type: 'text',
            margin: 'sm',
            wrap: true,
            size: 'xs',
            color: '#8B949E',
            text: 'ระบบจะเตือนล่วงหน้า 24 ชม. และย้ำซ้ำทุก 6 ชม. จนกว่าจะกดรับทราบ'
          }
        ]
      }
    }
  };
}

function row(label, value) {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: '#8B949E', size: 'sm', flex: 2 },
      { type: 'text', text: String(value), wrap: true, color: '#24292F', size: 'sm', flex: 5 }
    ]
  };
}

module.exports = appointmentCard;
