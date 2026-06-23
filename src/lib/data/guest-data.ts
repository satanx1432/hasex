'use client'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

const supabase = createClient()

// Guest mode data returns zero/null values
const guestStats = {
  completed: 0,
  rate: 0,
  streak: 0,
  total: 0
}

// Guest mode functions - now only return empty/zero values

export async function getActiveRoadmap(_userId: string) {
  return null
}

export async function getTodaysTask(_userId: string) {
  return null
}

export async function getUserStats(userId: string) {
  if (userId === 'guest') {
    return guestStats
  }
  // ... rest of the original function
}

export async function completeTask(_userId: string, _taskId: string, _completionData: {
  status: 'completed' | 'partially' | 'skipped'
  what_helped?: string
  what_got_in_way?: string
  energy_level?: number
}) {
  return { success: false }
}