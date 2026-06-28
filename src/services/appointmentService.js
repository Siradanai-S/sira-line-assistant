'use strict';

const supabase = require('../config/supabase');
const { DateTime, TZ } = require('../config/datetime');

/** บันทึกนัดหมายใหม่ (pendingConfirm=true = รอผู้ใช้กดยืนยันกรณีนัดซ้ำ) */
async function createAppointment({ userId, title, dateTime, location, calendarEventId, pendingConfirm }) {
  const { data, error } = await supabase
    .from('pm_appointments')
    .insert({
      user_id: userId || null,
      title,
      date_time: dateTime,
      location: location || null,
      calendar_event_id: calendarEventId || null,
      pending_confirm: Boolean(pendingConfirm)
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * หานัดที่ชนกัน: เวลานัดตรงเป๊ะ, ยังไม่ปิด, และไม่ใช่แถวที่รอยืนยันอยู่
 * @param {String} dateTime - ISO ของเวลานัดที่จะเช็ค
 * @returns {Object|null} นัดที่ชน (ถ้ามี)
 */
async function findConflict(dateTime) {
  const { data, error } = await supabase
    .from('pm_appointments')
    .select('*')
    .eq('date_time', dateTime)
    .eq('is_dismissed', false)
    .eq('pending_confirm', false)
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

/** ยืนยันนัดที่รอยืนยัน (ปลดธง pending_confirm) */
async function confirmPending(appointmentId) {
  const { data, error } = await supabase
    .from('pm_appointments')
    .update({ pending_confirm: false })
    .eq('id', appointmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ลบนัด (ใช้ตอนผู้ใช้กดยกเลิกนัดซ้ำ) */
async function deleteAppointment(appointmentId) {
  const { error } = await supabase
    .from('pm_appointments')
    .delete()
    .eq('id', appointmentId);
  if (error) throw error;
}

/** อัปเดต event id ของ Google Calendar ภายหลัง (เผื่อบันทึก calendar ช้ากว่า DB) */
async function setCalendarEventId(appointmentId, calendarEventId) {
  const { error } = await supabase
    .from('pm_appointments')
    .update({ calendar_event_id: calendarEventId })
    .eq('id', appointmentId);
  if (error) throw error;
}

/** ทำเครื่องหมายว่ารับทราบแล้ว (หยุด loop 6 ชม. + ล้าง snooze ถ้ามี) */
async function acknowledge(appointmentId) {
  const { data, error } = await supabase
    .from('pm_appointments')
    .update({ is_acknowledged: true, snooze_until: null })
    .eq('id', appointmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** เลื่อนการเตือนออกไป N ชั่วโมง (ดีฟอลต์ 1) — ระบบจะข้ามการเตือนจนกว่าจะถึง snooze_until */
async function snooze(appointmentId, hours = 1) {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('pm_appointments')
    .update({ snooze_until: until })
    .eq('id', appointmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ปิดการเตือนนัดนี้ถาวร (นัดยังอยู่ในระบบ แต่จะไม่ถูกเตือนอีก) */
async function dismiss(appointmentId) {
  const { data, error } = await supabase
    .from('pm_appointments')
    .update({ is_dismissed: true })
    .eq('id', appointmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ล้าง snooze แล้วอัปเดตเวลาเตือนล่าสุด (เรียกหลังส่งเตือนรอบ snooze เพื่อกลับเข้าวง 6 ชม.) */
async function clearSnoozeAndTouch(appointmentId) {
  const { error } = await supabase
    .from('pm_appointments')
    .update({ snooze_until: null, last_reminder_at: new Date().toISOString() })
    .eq('id', appointmentId);
  if (error) throw error;
}

/** อัปเดตเวลาเตือนล่าสุด (คุมจังหวะ loop 6 ชม.) */
async function touchReminder(appointmentId) {
  const { error } = await supabase
    .from('pm_appointments')
    .update({ last_reminder_at: new Date().toISOString() })
    .eq('id', appointmentId);
  if (error) throw error;
}

/** ทำเครื่องหมายว่าได้ส่ง Final Alert (1 ชม.ก่อน) แล้ว */
async function markFinalSent(appointmentId) {
  const { error } = await supabase
    .from('pm_appointments')
    .update({ reminded_1h_sent: true })
    .eq('id', appointmentId);
  if (error) throw error;
}

/**
 * ดึงนัดหมายที่ยังไม่รับทราบ และเวลานัดอยู่ในอีก 0-24 ชม.ข้างหน้า
 * ใช้สำหรับด่านเตือน 24 ชม. + loop 6 ชม.
 */
async function findPendingWithin24h() {
  const nowIso = new Date().toISOString();
  const in24hIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('pm_appointments')
    .select('*')
    .eq('is_acknowledged', false)
    .eq('is_dismissed', false)
    .eq('pending_confirm', false)
    .gte('date_time', nowIso)
    .lte('date_time', in24hIso);
  if (error) throw error;
  return data || [];
}

/**
 * ดึงนัดหมายที่รับทราบแล้ว, ยังไม่ส่ง Final Alert, และเหลือเวลา <= 1 ชม.
 * ใช้สำหรับด่านเตือนรอบสุดท้าย
 */
async function findAcknowledgedWithin1h() {
  const nowIso = new Date().toISOString();
  const in1hIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('pm_appointments')
    .select('*')
    .eq('is_acknowledged', true)
    .eq('reminded_1h_sent', false)
    .eq('is_dismissed', false)
    .gte('date_time', nowIso)
    .lte('date_time', in1hIso);
  if (error) throw error;
  return data || [];
}

/** นัดหมายของ"วันนี้" (ตาม timezone) สำหรับรายงานเช้า */
async function findToday() {
  const start = DateTime.now().setZone(TZ).startOf('day').toUTC().toISO();
  const end = DateTime.now().setZone(TZ).endOf('day').toUTC().toISO();
  const { data, error } = await supabase
    .from('pm_appointments')
    .select('*')
    .eq('pending_confirm', false)
    .gte('date_time', start)
    .lte('date_time', end)
    .order('date_time', { ascending: true });
  if (error) throw error;
  return data || [];
}

module.exports = {
  createAppointment,
  findConflict,
  confirmPending,
  deleteAppointment,
  setCalendarEventId,
  acknowledge,
  snooze,
  dismiss,
  clearSnoozeAndTouch,
  touchReminder,
  markFinalSent,
  findPendingWithin24h,
  findAcknowledgedWithin1h,
  findToday
};
