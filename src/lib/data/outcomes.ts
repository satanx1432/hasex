import { createClient } from '@/lib/supabase/client'

const supabase = createClient() as any

export async function createOutcome(userId: string, outcome: string, impact: 'positive' | 'neutral' | 'challenging') {
  const { data, error } = await supabase
    .from('outcomes')
    .insert({ user_id: userId, outcome_text: outcome, impact })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getOutcomes(userId: string) {
  const { data, error } = await supabase
    .from('outcomes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}