import { createClient } from '@/lib/supabase/client'

const supabase = createClient() as any

// ---------- GOALS ----------

export async function createGoal(userId: string, title: string, classification: any) {
  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: userId, title, classification, status: 'active' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getActiveGoal(userId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (error) return null
  return data
}

// ---------- DESTINATIONS ----------

export async function createDestination(userId: string, goalId: string, destination: {
  destination_text: string
  duration: string
  complexity: 'low' | 'medium' | 'high'
  reason: string
}) {
  const { data, error } = await supabase
    .from('destinations')
    .insert({ user_id: userId, goal_id: goalId, ...destination })
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------- ROADMAPS + STAGES ----------

export async function createRoadmap(userId: string, goalId: string, destinationId: string, stages: {
  title: string
  description: string
  sort_order: number
  category?: string
}[]) {
  const { data: roadmap, error: roadmapError } = await supabase
    .from('roadmaps')
    .insert({ user_id: userId, goal_id: goalId, destination_id: destinationId, status: 'active' })
    .select()
    .single()

  if (roadmapError) throw roadmapError
  if (!roadmap) throw new Error('Failed to create roadmap')

  let createdStages: any[] = []
  if (stages.length > 0) {
    const { data: stagesData, error: stageError } = await supabase
      .from('roadmap_stages')
      .insert(stages.map(stage => ({
        ...stage,
        user_id: userId,
        roadmap_id: roadmap.id
      })))
      .select()

    if (stageError) throw stageError
    createdStages = stagesData || []
  }

  return { roadmap, stages: createdStages }
}

export async function getActiveRoadmap(userId: string) {
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (goalError || !goal) return null

  const { data: destination } = await supabase
    .from('destinations')
    .select('*')
    .eq('user_id', userId)
    .eq('goal_id', goal.id)
    .limit(1)
    .single()

  const { data: roadmap } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .eq('goal_id', goal.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!roadmap) return null

  const { data: stages } = await supabase
    .from('roadmap_stages')
    .select('*')
    .eq('roadmap_id', roadmap.id)
    .order('sort_order')

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      description: goal.description
    },
    destination: {
      destination_text: destination?.destination_text || '',
      duration: destination?.duration || '',
      complexity: destination?.complexity || 'medium',
      reason: destination?.reason || ''
    },
    roadmap: {
      id: roadmap.id,
      status: roadmap.status || 'active'
    },
    stages: (stages || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      category: s.category,
      sort_order: s.sort_order
    }))
  }
}

// ---------- TASKS ----------

export async function createTask(userId: string, goalId: string, stageId: string, task: {
  title: string
  description: string
  if_then_plan?: string
  difficulty_score: number
  estimated_minutes?: number
  scheduled_for?: string
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      goal_id: goalId,
      stage_id: stageId,
      ...task,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTodaysTask(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('tasks')
    .select('*, stage:roadmap_stages(*)')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .or(`scheduled_for.lte.${today},scheduled_for.is.null`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  const stage = Array.isArray(data.stage) ? data.stage[0] : data.stage

  return {
    ...data,
    status: data.status as 'pending' | 'in_progress' | 'completed' | 'skipped',
    stage: stage ? {
      title: stage.title,
      description: stage.description,
      category: stage.category
    } : undefined
  }
}

export async function updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'skipped') {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw error
}

// ---------- TASK COMPLETIONS ----------

export async function completeTask(userId: string, taskId: string, completionData: {
  status: 'completed' | 'partially' | 'skipped'
  what_helped?: string
  what_got_in_way?: string
  energy_level?: number
}) {
  const { error: completionError } = await supabase
    .from('task_completions')
    .insert({
      user_id: userId,
      task_id: taskId,
      ...completionData
    })

  if (completionError) throw completionError

  const { error: taskError } = await supabase
    .from('tasks')
    .update({ status: completionData.status === 'completed' ? 'completed' : 'skipped' })
    .eq('id', taskId)

  if (taskError) throw taskError
}

export async function getTaskCompletions(userId: string, limit: number = 30) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*, task:tasks(*)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// ---------- USER STATS ----------

export async function getUserStats(userId: string) {
  const { data: completions } = await supabase
    .from('task_completions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })

  const total = completions?.length || 0
  const completed = completions?.filter((c: any) => c.status === 'completed').length || 0
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  let streak = 0
  if (completions) {
    let lastDate: Date | null = null
    for (const c of completions) {
      if (c.status !== 'completed') break
      const date = new Date(c.completed_at || '')
      if (!lastDate || (lastDate.getTime() - date.getTime()) <= 86400000) {
        streak++
        lastDate = date
      } else {
        break
      }
    }
  }

  return { completed, rate, streak, total }
}

// ---------- FIRST TASK CREATION ----------

export async function createFirstTask(userId: string, goalId: string, stageId: string, task: {
  title: string
  description: string
  if_then_plan?: string
  difficulty_score: number
  estimated_minutes?: number
}) {
  return createTask(userId, goalId, stageId, {
    ...task,
    scheduled_for: new Date().toISOString().split('T')[0]
  })
}
