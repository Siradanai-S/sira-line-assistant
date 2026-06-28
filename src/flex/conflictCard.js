'use strict';

const { formatThaiDateTime } = require('../config/datetime');

/**
 * การ์ดแจ้งเตือนนัดซ้ำ (วัน+เวลาตรงกับนัดเดิม) — ถามผู้ใช้ก่อนบันทึก
 * ปุ่ม [บันทึกซ้อน] = ยืนยันนัดใหม่ (pending) , [ยกเลิก] = ลบนัดใหม่ทิ้ง
 * @param {Object} pending  - นัดใหม่ที่รอยืนยัน { id, title, date_time, location }
 * @param {Object} existing - นัดเดิมที่ชน { title, date_time, location }
 */
function conflictCard(pending, existing) {
  return {
    type: 'flex',
    altText: `⚠️ พบนัดซ้ำเวลาเดียวกัน: ${pending.title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#9A6700',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: '⚠️ พบนัดหมายซ้ำเวลาเดียวกัน', color: '#FFFFFF', weight: 'bold', size: 'md', wrap: true }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'มีนัดอยู่แล้วในเวลานี้:', size: 'sm', color: '#8B949E' },
          block('🗓️ นัดเดิม', existing),
          { type: 'separator', margin: 'md' },
          { type: 'text', text: 'นัดใหม่ที่จะบันทึก:', size: 'sm', color: '#8B949E', margin: 'md' },
          block('🆕 นัดใหม่', pending),
          { type: 'text', text: 'ต้องการให้ทำอย่างไร?', size: 'sm', wrap: true, color: '#24292F', margin: 'md', weight: 'bold' }
        ]
      },
      footer: {
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
              label: '✅ เก็บทั้งคู่ (บันทึกซ้อน)',
              data: `action=confirm_appt&appointmentId=${pending.id}`,
              displayText: 'เก็บทั้งสองนัด (ซ้อนเวลาเดิม)'
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '🗑️ ยกเลิกนัดใหม่',
              data: `action=cancel_new&appointmentId=${pending.id}`,
              displayText: 'ยกเลิกนัดใหม่ (เก็บนัดเดิม)'
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '♻️ ยกเลิกนัดเดิม (ใช้นัดใหม่แทน)',
              data: `action=cancel_old&appointmentId=${pending.id}&oldId=${existing.id}`,
              displayText: 'ยกเลิกนัดเดิม ใช้นัดใหม่แทน'
            }
          }
        ]
      }
    }
  };
}

function block(label, appt) {
  return {
    type: 'box',
    layout: 'vertical',
    spacing: 'xs',
    margin: 'sm',
    contents: [
      { type: 'text', text: `${label}: ${appt.title}`, size: 'sm', weight: 'bold', wrap: true, color: '#24292F' },
      { type: 'text', text: `🕒 ${formatThaiDateTime(appt.date_time)}`, size: 'xs', color: '#57606A', wrap: true },
      { type: 'text', text: `📍 ${appt.location || '-'}`, size: 'xs', color: '#57606A', wrap: true }
    ]
  };
}

module.exports = conflictCard;
