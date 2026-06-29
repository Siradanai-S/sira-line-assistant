'use strict';

const supabase = require('../config/supabase');
const { DateTime, TZ } = require('../config/datetime');

/** เพิ่มงานใหม่ (จากข้อความ หรือจากเสียง) — dueDate รูปแบบ 'YYYY-MM-DD' (ถ้ามี) */
async function createTask({ userId, description, source, dueDate }) {
  const { data, error } = await supabase
    .from('pm_tasks')
    .insert({
      user_id: userId || null,
      task_description: description,
      due_date: dueDate || null,
      source: source || 'text'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ดึงงานที่ยังค้าง (Pending) ทั้งหมด */
async function findPending() {
  const { data, error } = await supabase
    .from('pm_tasks')
    .select('*')
    .eq('status', 'Pending')
    .eq('is_dismissed', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * ดึงงานที่ถึงกำหนดแล้ว (due_date <= วันนี้) และยังไม่เสร็จ — สำหรับ digest เช้า
 * รวมทั้งที่ครบกำหนดวันนี้และที่เลยกำหนด (overdue) เรียงตามวันใกล้สุดก่อน
 */
async function findDueAndOverdue() {
  const todayDate = DateTime.now().setZone(TZ).toISODate();
  const { data, error } = await supabase
    .from('pm_tasks')
    .select('*')
    .eq('status', 'Pending')
    .eq('is_dismissed', false)
    .not('due_date', 'is', null)
    .lte('due_date', todayDate)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** To-Do ที่มีกำหนดส่งตรงกับวันที่กำหนด (สำหรับการถามสรุปแผนงาน) */
async function findByDueDate(dateIso) {
  const { data, error } = await supabase
    .from('pm_tasks')
    .select('*')
    .eq('is_dismissed', false)
    .eq('due_date', dateIso)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** ลบงานทิ้ง (ใช้ตอนผู้ใช้กดยกเลิก To-Do) */
async function deleteTask(taskId) {
  const { error } = await supabase
    .from('pm_tasks')
    .delete()
    .eq('id', taskId);
  if (error) throw error;
}

/** ปิดงาน (ตั้งสถานะ Done) */
async function markDone(taskId) {
  const { data, error } = await supabase
    .from('pm_tasks')
    .update({ status: 'Done' })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  createTask,
  findPending,
  findDueAndOverdue,
  findByDueDate,
  deleteTask,
  markDone
};
