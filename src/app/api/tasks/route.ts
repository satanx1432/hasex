import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createTask, getTodaysTask, updateTaskStatus } from '@/lib/data/goals'

// GET today's task for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const task = await getTodaysTask(user.id)
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// POST create a new task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goalId, stageId, title, description, if_then_plan, difficulty_score, estimated_minutes, scheduled_for } = body

    if (!title || !goalId || !stageId) {
      return NextResponse.json({ error: 'Title, goalId, and stageId are required' }, { status: 400 })
    }

    const task = await createTask(user.id, goalId, stageId, {
      title,
      description: description || '',
      if_then_plan,
      difficulty_score: difficulty_score || 5,
      estimated_minutes,
      scheduled_for
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    )
  }
}

// PATCH update task status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, status } = body

    if (!taskId || !status) {
      return NextResponse.json({ error: 'TaskId and status are required' }, { status: 400 })
    }

    await updateTaskStatus(taskId, status)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    )
  }
}
