'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient() as any

export async function updateTaskStatus(taskId: string, status: 'in_progress' | 'completed') {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw error
}

export async function recordTaskCompletion(taskId: string, data: {
  status: 'completed' | 'partially' | 'skipped'
  what_helped?: string
  what_got_in_way?: string
  energy_level?: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Insert completion record
  const { error: completionError } = await supabase
    .from('task_completions')
    .insert({
      user_id: user.id,
      task_id: taskId,
      ...data
    })

  if (completionError) throw completionError

  // Update task status
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: data.status === 'completed' ? 'completed' : 'skipped' })
    .eq('id', taskId)

  if (updateError) throw updateError
}
