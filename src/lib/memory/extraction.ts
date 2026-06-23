import { qdrantClient, LongTermMemory, RetrievedMemory } from './qdrant-client'
import { embeddingService } from './embedding-service'
import { memoryRetrieval } from './retrieval'
import { nvidiaNIMService } from '@/lib/ai/nvidia-nim'

class MemoryExtraction {
  private extractionPrompt = `You are a memory extraction expert. Analyze conversation messages to identify and extract long-term memories.

Extract the following types of information:
- GOALS: Stated goals, aspirations, objectives the user wants to achieve
- PREFERENCES: User preferences, likes, dislikes, working styles, communication preferences
- PROJECTS: Ongoing projects, tasks, initiatives the user is working on
- FACTS: Important facts about the user (name, job, location, family, etc.)

Return a JSON response with this structure:
{
  "goals": ["list of identified goals"],
  "preferences": ["list of identified preferences"],
  "projects": ["list of identified projects"],
  "facts": ["list of important facts"]
}

Only include information explicitly stated or strongly implied in the messages. Do not invent or assume information.`

  async extractMemories(userId: string, messages: RetrievedMemory[]): Promise<{
    goals: string[]
    preferences: string[]
    projects: string[]
    facts: string[]
  }> {
    if (!nvidiaNIMService.isConfigured() || messages.length === 0) {
      return { goals: [], preferences: [], projects: [], facts: [] }
    }

    try {
      const messageTexts = messages.map(m => 
        `[${m.payload.role.toUpperCase()}] ${m.payload.content}`
      ).join('\n\n')

      const response = await nvidiaNIMService.makeRequest(
        'moonshotai/kimi-k2-6',
        [
          { role: 'system', content: this.extractionPrompt },
          { role: 'user', content: `Extract long-term memories from these messages:\n\n${messageTexts}` }
        ],
        0.3
      )

      const parsed = JSON.parse(response)
      return {
        goals: parsed.goals || [],
        preferences: parsed.preferences || [],
        projects: parsed.projects || [],
        facts: parsed.facts || [],
      }
    } catch (error) {
      console.error('Memory extraction failed:', error)
      return { goals: [], preferences: [], projects: [], facts: [] }
    }
  }

  async storeExtractedMemories(
    userId: string,
    extracted: {
      goals: string[]
      preferences: string[]
      projects: string[]
      facts: string[]
    }
  ): Promise<void> {
    const memories: Array<{
      type: 'goal' | 'preference' | 'project' | 'fact'
      content: string
    }> = []

    extracted.goals.forEach(g => memories.push({ type: 'goal', content: g }))
    extracted.preferences.forEach(p => memories.push({ type: 'preference', content: p }))
    extracted.projects.forEach(p => memories.push({ type: 'project', content: p }))
    extracted.facts.forEach(f => memories.push({ type: 'fact', content: f }))

    for (const memory of memories) {
      const id = `${userId}_${memory.type}_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const vector = await embeddingService.generateEmbedding(memory.content)

      await qdrantClient.upsertLongTermMemory(id, vector, {
        user_id: userId,
        memory_type: memory.type,
        content: memory.content,
        extracted_at: new Date().toISOString(),
        confidence: 0.8,
        source_messages: [],
      })
    }
  }

  async getLongTermMemories(userId: string, memoryType?: 'goal' | 'preference' | 'project' | 'fact'): Promise<LongTermMemory[]> {
    if (memoryType) {
      return qdrantClient.searchLongTermMemories(new Array(1024).fill(0), userId, memoryType, 10)
    }

    const [goals, preferences, projects, facts] = await Promise.all([
      qdrantClient.searchLongTermMemories(new Array(1024).fill(0), userId, 'goal', 5),
      qdrantClient.searchLongTermMemories(new Array(1024).fill(0), userId, 'preference', 5),
      qdrantClient.searchLongTermMemories(new Array(1024).fill(0), userId, 'project', 5),
      qdrantClient.searchLongTermMemories(new Array(1024).fill(0), userId, 'fact', 5),
    ])

    return [...goals, ...preferences, ...projects, ...facts]
  }

  async refreshMemories(userId: string, recentMessages: RetrievedMemory[]): Promise<void> {
    const extracted = await this.extractMemories(userId, recentMessages)
    await this.storeExtractedMemories(userId, extracted)
  }
}

export const memoryExtraction = new MemoryExtraction()