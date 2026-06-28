'use strict';

const { formatThaiDateTime } = require('../config/datetime');

/**
 * การ์ดเตือนนัดหมาย พร้อมปุ่ม [รับทราบ] [เลื่อน 1 ชม.] [ปิด]
 * ปุ่มใช้ postback action ส่ง data กลับมาที่ webhook เพื่ออัปเดตสถานะนัด
 * @param {Object} appt - { id, title, date_time, location }
 * @param {String} phase - 'first24' | 'repeat6' | 'snooze' | 'final1'
 */
function reminderCard(appt, phase) {
  const headerText = {
    first24: '⏰ เตือนล่วงหน้า 24 ชั่วโมง',
    repeat6: '🔁 เตือนซ้ำ (ยังไม่ได้กดรับทราบ)',
    snooze: '🔔 เตือนอีกครั้ง (เลื่อนมาก่อนหน้านี้)',
    final1: '🚨 เตือนรอบสุดท้าย — อีก 1 ชั่วโมง'
  }[phase] || '⏰ เตือนนัดหมาย';

  const headerColor = phase === 'final1' ? '#CF222E' : '#BC4C00';

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: headerColor,
      paddingAll: '16px',
      contents: [
        { type: 'text', text: headerText, color: '#FFFFFF', weight: 'bold', size: 'md', wrap: true }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      paddingAll: '16px',
      contents: [
        { type: 'text', text: appt.title, weight: 'bold', size: 'lg', wrap: true, color: '#24292F' },
        row('🕒 เวลา', formatThaiDateTime(appt.date_time)),
        row('📍 สถานที่', appt.location || '-')
      ]
    }
  };

  // รอบ final1 ไม่ต้องมีปุ่มแล้ว (รับทราบไปก่อนหน้าแล้ว) ส่วนรอบอื่นแนบปุ่ม รับทราบ/เลื่อน/ปิด
  if (phase !== 'final1') {
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '12px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#1A7F37',
          height: 'sm',
          action: {
            type: 'postback',
            label: '✅ รับทราบแล้ว',
            data: `action=acknowledge&appointmentId=${appt.id}`,
            displayText: 'รับทราบนัดหมายแล้ว'
          }
        },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'postback',
            label: '⏰ เลื่อน 1 ชม.',
            data: `action=snooze&appointmentId=${appt.id}`,
            displayText: 'เลื่อนการเตือน 1 ชั่วโมง'
          }
        },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'postback',
            label: '✖️ ปิดการเตือน',
            data: `action=dismiss&appointmentId=${appt.id}`,
            displayText: 'ปิดการเตือนนัดนี้'
          }
        }
      ]
    };
  }

  return {
    type: 'flex',
    altText: `เตือนนัดหมาย: ${appt.title}`,
    contents: bubble
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

module.exports = reminderCard;
