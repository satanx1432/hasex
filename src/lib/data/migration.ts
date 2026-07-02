'use client'

import { createGoal, createDestination, createRoadmap, createFirstTask } from './goals'
import { DatabaseService } from '@/lib/supabase/database'

interface GuestData {
  goals: any[]
  tasks: any[]
  outcomes: any[]
  insights: any[]
  checkIns: any[]
  stats: any
  analytics: any[]
}

interface GuestData {
  goals: any[]
  tasks: any[]
  outcomes: any[]
  insights: any[]
  checkIns: any[]
  stats: any
  analytics: any[]
}

export async function migrateGuestData(userId: string, guestData: GuestData): Promise<void> {
  const db = new DatabaseService()

  try {
    // Migrate goals
    for (const guestGoal of guestData.goals) {
      try {
        // Create goal in database
        const goalData = await createGoal(userId, guestGoal.title, {
          type: guestGoal.type || 'personal',
          complexity: guestGoal.complexity || 'medium',
          confidence: guestGoal.confidence || 0.8
        })

        // If goal has destination data, migrate that too
        if (guestGoal.destination) {
          const destinationData = await createDestination(userId, goalData.id, {
            destination_text: guestGoal.destination.destination_text,
            duration: guestGoal.destination.duration,
            complexity: guestGoal.destination.complexity,
            reason: guestGoal.destination.reason
          })

          // Create roadmap if stages exist
          if (guestGoal.stages && guestGoal.stages.length > 0) {
            const stages = guestGoal.stages.map((stage: any) => ({
              title: stage.title,
              description: stage.description,
              sort_order: stage.sort_order,
              category: stage.category
            }))

            await createRoadmap(userId, goalData.id, destinationData.id, stages)
          }
        }
      } catch (error) {
        console.error('Failed to migrate goal:', guestGoal.id, error)
      }
    }

    // Note: Tasks, outcomes, and check-ins are not migrated as there are no corresponding database methods
    // Only goals, destinations, roadmaps, and insights are migrated

    // Note: Outcomes and check-ins are not migrated as there are no corresponding database methods
    // These are kept separate for now

    // Migrate insights (guest insights are generated locally, may not translate directly)
    for (const guestInsight of guestData.insights) {
      try {
        await db.createInsight({
          user_id: userId,
          insight_type: guestInsight.insight_type,
          title: guestInsight.title,
          content: guestInsight.content,
          actionable_suggestion: guestInsight.actionable_suggestion,
          read: false
        })
      } catch (error) {
        console.error('Failed to migrate insight:', guestInsight.id, error)
      }
    }

    // Note: Analytics data is typically kept separate and not migrated to preserve privacy
    // But we could store aggregated analytics if needed

    console.log('Guest data migration completed successfully')
  } catch (error) {
    console.error('Guest data migration failed:', error)
    throw error
  }
}

export async function shouldMigrateGuestData(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const guestMode = localStorage.getItem('guestMode')
  if (guestMode !== 'true') return false
  
  // Check if there's any meaningful guest data
  const goals = localStorage.getItem('guest_goals')
  const tasks = localStorage.getItem('guest_tasks')
  
  if (goals && JSON.parse(goals).length > 0) return true
  if (tasks && JSON.parse(tasks).length > 0) return true
  
  return false
}