'use strict';

const supabase = require('../config/supabase');

/** เพิ่มงานใหม่ (จากข้อความ หรือจากเสียง) */
async function createTask({ userId, description, source }) {
  const { data, error } = await supabase
    .from('pm_tasks')
    .insert({
      user_id: userId || null,
      task_description: description,
      source: source || 'text'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ดึงงานที่ยังค้าง (Pending) */
async function findPending() {
  const { data, error } = await supabase
    .from('pm_tasks')
    .select('*')
    .eq('status', 'Pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
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
  markDone
};
