'use client'

import type { Database } from '@/types/database'

// LocalStorage keys for guest data
const GUEST_DATA_PREFIX = 'guest_'

// Helper functions for localStorage (exported for use in other modules)
export const getGuestData = (key: string) => {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(`${GUEST_DATA_PREFIX}${key}`)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error reading guest data:', error)
    return null
  }
}

export const setGuestData = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${GUEST_DATA_PREFIX}${key}`, JSON.stringify(value))
  } catch (error) {
    console.error('Error saving guest data:', error)
  }
}

export const removeGuestData = (key: string) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${GUEST_DATA_PREFIX}${key}`)
  } catch (error) {
    console.error('Error removing guest data:', error)
  }
}

// Clear all guest data
export function clearAllGuestData() {
  if (typeof window === 'undefined') return
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(GUEST_DATA_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Error clearing guest data:', error)
  }
}

// Guest goals
export async function getGuestGoals() {
  return getGuestData('goals') || []
}

export async function saveGuestGoal(goal: any) {
  const goals = await getGuestGoals()
  const newGoal = { ...goal, id: `guest_${Date.now()}`, created_at: new Date().toISOString() }
  goals.push(newGoal)
  setGuestData('goals', goals)
  return newGoal
}

export async function updateGuestGoal(goalId: string, updates: any) {
  const goals = await getGuestGoals()
  const index = goals.findIndex((g: any) => g.id === goalId)
  if (index !== -1) {
    goals[index] = { ...goals[index], ...updates }
    setGuestData('goals', goals)
    return goals[index]
  }
  return null
}

export async function getActiveGuestGoal() {
  const goals = await getGuestGoals()
  return goals.find((g: any) => g.status === 'active') || null
}

// Guest tasks/micro-actions
export async function getGuestTasks() {
  return getGuestData('tasks') || []
}

export async function saveGuestTask(task: any) {
  const tasks = await getGuestTasks()
  const newTask = { ...task, id: `guest_${Date.now()}`, created_at: new Date().toISOString() }
  tasks.push(newTask)
  setGuestData('tasks', tasks)
  return newTask
}

export async function getTodaysGuestTask() {
  const tasks = await getGuestTasks()
  const today = new Date().toISOString().split('T')[0]
  return tasks.find((t: any) => (t.scheduled_for === today || t.scheduled_date === today) && t.status === 'pending') || null
}

export async function getWeekGuestTasks() {
  const tasks = await getGuestTasks()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)
  
  return tasks.filter((t: any) => {
    const taskDate = new Date(t.scheduled_for || t.scheduled_date || '')
    if (!taskDate.getTime()) return false
    return taskDate >= today && taskDate <= weekEnd
  }).sort((a: any, b: any) => new Date(a.scheduled_for || a.scheduled_date || 0).getTime() - new Date(b.scheduled_for || b.scheduled_date || 0).getTime())
}

export async function getGuestTaskCompletions() {
  return getGuestData('task_completions') || []
}

export async function completeGuestTask(taskId: string, completionData: any) {
  const tasks = await getGuestTasks()
  const index = tasks.findIndex((t: any) => t.id === taskId)
  if (index !== -1) {
    tasks[index] = { 
      ...tasks[index], 
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_data: completionData
    }
    setGuestData('tasks', tasks)
    
    // Update stats
    await updateGuestStats()
    
    return { success: true, task: tasks[index] }
  }
  return { success: false }
}

// Guest stats
export async function getGuestStats() {
  const stats = getGuestData('stats')
  if (stats) return stats
  
  // Calculate from tasks if no cached stats
  const tasks = await getGuestTasks()
  const completedTasks = tasks.filter((t: any) => t.status === 'completed')
  
  const calculatedStats = {
    completed: completedTasks.length,
    total: tasks.length,
    rate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    streak: calculateGuestStreak(completedTasks)
  }
  
  setGuestData('stats', calculatedStats)
  return calculatedStats
}

async function updateGuestStats() {
  const stats = await getGuestStats()
  setGuestData('stats', stats)
}

function calculateGuestStreak(completedTasks: any[]): number {
  if (completedTasks.length === 0) return 0
  
  const sortedTasks = [...completedTasks].sort((a, b) => 
    new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  )
  
  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  
  for (const task of sortedTasks) {
    const taskDate = new Date(task.completed_at)
    taskDate.setHours(0, 0, 0, 0)
    
    const diffDays = Math.floor((currentDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === streak) {
      streak++
      currentDate = taskDate
    } else if (diffDays > streak) {
      break
    }
  }
  
  return streak
}

// Guest outcomes
export async function getGuestOutcomes() {
  return getGuestData('outcomes') || []
}

export async function saveGuestOutcome(outcome: any) {
  const outcomes = await getGuestOutcomes()
  const newOutcome = { ...outcome, id: `guest_${Date.now()}`, created_at: new Date().toISOString() }
  outcomes.push(newOutcome)
  setGuestData('outcomes', outcomes)
  return newOutcome
}

// Guest insights (generated and stored locally)
export async function getGuestInsights() {
  return getGuestData('insights') || []
}

export async function saveGuestInsight(insight: any) {
  const insights = await getGuestInsights()
  const newInsight = { ...insight, id: `guest_${Date.now()}`, created_at: new Date().toISOString() }
  insights.push(newInsight)
  setGuestData('insights', insights)
  return newInsight
}

// Guest check-in data
export async function getGuestCheckIns() {
  return getGuestData('checkins') || []
}

export async function saveGuestCheckIn(checkIn: any) {
  const checkIns = await getGuestCheckIns()
  const newCheckIn = { ...checkIn, id: `guest_${Date.now()}`, created_at: new Date().toISOString() }
  checkIns.push(newCheckIn)
  setGuestData('checkins', checkIns)
  return newCheckIn
}

// Guest settings
export async function getGuestSettings() {
  const settings = getGuestData('settings')
  if (settings) return settings
  
  return {
    theme: 'dark',
    notifications: true,
    aiVoice: false,
    dailyReminders: true,
    weeklyReports: true,
    publicProfile: false,
    dataSharing: false
  }
}

export async function saveGuestSettings(settings: any) {
  setGuestData('settings', settings)
  return settings
}

// Export guest data for account upgrade
export async function exportGuestData() {
  return {
    goals: await getGuestGoals(),
    tasks: await getGuestTasks(),
    outcomes: await getGuestOutcomes(),
    insights: await getGuestInsights(),
    checkIns: await getGuestCheckIns(),
    stats: await getGuestStats(),
    settings: await getGuestSettings(),
    analytics: getGuestData('analytics_events') || []
  }
}