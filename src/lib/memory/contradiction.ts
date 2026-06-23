/**
 * Contradiction Detection and Resolution System
 * Detects contradictions between memories and resolves them intelligently
 */

import { createClient } from '@supabase/supabase-js'

interface ContradictionResult {
  has_contradiction: boolean
  contradiction_type: 'semantic' | 'behavioral' | 'episodic' | 'cross_layer'
  confidence: number
  old_memory: any
  new_evidence: any
  resolution_strategy: 'strengthen_old' | 'strengthen_new' | 'merge' | 'decay_both' | 'create_both'
  recommended_confidence_adjustment: {
    old_memory_confidence: number
    new_evidence_confidence: number
  }
  explanation: string
}

interface MemoryEvolution {
  memory_id: string
  memory_type: 'episodic' | 'semantic' | 'behavioral'
  confidence_before: number
  confidence_after: number
  change_reason: 'contradiction' | 'strengthening' | 'decay' | 'new_evidence'
  timestamp: string
  metadata: Record<string, any>
}

class ContradictionDetector {
  private supabase: any
  private contradiction_threshold: number

  constructor(supabaseUrl: string, supabaseKey: string, threshold: number = 0.7) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.contradiction_threshold = threshold
  }

  /**
   * Detect contradictions between new evidence and existing memories
   */
  async detectContradictions(
    userId: string,
    newEvidence: any,
    conversationContext?: any[]
  ): Promise<ContradictionResult[]> {
    const contradictions: ContradictionResult[] = []

    // Get existing memories for comparison
    const existingMemories = await this.getExistingMemories(userId)

    // Check for semantic contradictions
    if (newEvidence.trait || newEvidence.behavior_type) {
      const semanticContradictions = await this.detectSemanticContradictions(
        existingMemories.semantic,
        newEvidence
      )
      contradictions.push(...semanticContradictions)
    }

    // Check for behavioral contradictions
    if (newEvidence.behavior_type) {
      const behavioralContradictions = await this.detectBehavioralContradictions(
        existingMemories.behavioral,
        newEvidence
      )
      contradictions.push(...behavioralContradictions)
    }

    // Check for episodic contradictions
    if (newEvidence.event_type) {
      const episodicContradictions = await this.detectEpisodicContradictions(
        existingMemories.episodic,
        newEvidence
      )
      contradictions.push(...episodicContradictions)
    }

    // Check for cross-layer contradictions
    const crossLayerContradictions = await this.detectCrossLayerContradictions(
      existingMemories,
      newEvidence
    )
    contradictions.push(...crossLayerContradictions)

    return contradictions.filter(c => c.confidence >= this.contradiction_threshold)
  }

  private async getExistingMemories(userId: string): Promise<{
    semantic: any[]
    behavioral: any[]
    episodic: any[]
  }> {
    const [semantic, behavioral, episodic] = await Promise.all([
      this.supabase
        .from('semantic_memories')
        .select('*')
        .eq('user_id', userId)
        .gte('confidence', 0.3),
      
      this.supabase
        .from('behavioral_memories')
        .select('*')
        .eq('user_id', userId)
        .gte('confidence', 0.3),
      
      this.supabase
        .from('episodic_memories')
        .select('*')
        .eq('user_id', userId)
        .gte('confidence', 0.3)
    ])

    return {
      semantic: semantic.data || [],
      behavioral: behavioral.data || [],
      episodic: episodic.data || []
    }
  }

  private async detectSemanticContradictions(
    existingTraits: any[],
    newEvidence: any
  ): Promise<ContradictionResult[]> {
    const contradictions: ContradictionResult[] = []

    if (!newEvidence.trait) return contradictions

    // Find existing traits with the same trait name
    const sameTraits = existingTraits.filter(t => t.trait === newEvidence.trait)

    for (const existing of sameTraits) {
      // Check if values contradict
      const contradictionScore = this.calculateSemanticContradiction(
        existing.value,
        newEvidence.value,
        existing.trait
      )

      if (contradictionScore >= this.contradiction_threshold) {
        contradictions.push({
          has_contradiction: true,
          contradiction_type: 'semantic',
          confidence: contradictionScore,
          old_memory: existing,
          new_evidence: newEvidence,
          resolution_strategy: this.determineResolutionStrategy(
            existing.confidence,
            newEvidence.confidence || 0.5,
            contradictionScore
          ),
          recommended_confidence_adjustment: {
            old_memory_confidence: this.calculateAdjustedConfidence(
              existing.confidence,
              'decrease',
              contradictionScore
            ),
            new_evidence_confidence: this.calculateAdjustedConfidence(
              newEvidence.confidence || 0.5,
              'increase',
              contradictionScore
            )
          },
          explanation: `User previously stated "${existing.value}" for trait "${existing.trait}", but new evidence suggests "${newEvidence.value}"`
        })
      }
    }

    return contradictions
  }

  private async detectBehavioralContradictions(
    existingPatterns: any[],
    newEvidence: any
  ): Promise<ContradictionResult[]> {
    const contradictions: ContradictionResult[] = []

    if (!newEvidence.behavior_type) return contradictions

    // Find existing patterns with the same behavior type
    const samePatterns = existingPatterns.filter(
      p => p.behavior_type === newEvidence.behavior_type
    )

    for (const existing of samePatterns) {
      // Check if observations contradict
      const contradictionScore = this.calculateBehavioralContradiction(
        existing.observation,
        newEvidence.observation,
        existing.behavior_type
      )

      if (contradictionScore >= this.contradiction_threshold) {
        contradictions.push({
          has_contradiction: true,
          contradiction_type: 'behavioral',
          confidence: contradictionScore,
          old_memory: existing,
          new_evidence: newEvidence,
          resolution_strategy: this.determineResolutionStrategy(
            existing.confidence,
            newEvidence.confidence || 0.5,
            contradictionScore
          ),
          recommended_confidence_adjustment: {
            old_memory_confidence: this.calculateAdjustedConfidence(
              existing.confidence,
              'decrease',
              contradictionScore
            ),
            new_evidence_confidence: this.calculateAdjustedConfidence(
              newEvidence.confidence || 0.5,
              'increase',
              contradictionScore
            )
          },
          explanation: `User previously exhibited behavior "${existing.observation}" for type "${existing.behavior_type}", but new evidence shows "${newEvidence.observation}"`
        })
      }
    }

    return contradictions
  }

  private async detectEpisodicContradictions(
    existingEvents: any[],
    newEvidence: any
  ): Promise<ContradictionResult[]> {
    const contradictions: ContradictionResult[] = []

    if (!newEvidence.event_type) return contradictions

    // Check for contradictory event sequences
    const recentContradictoryEvents = existingEvents.filter(e => {
      // Events within 7 days that contradict
      const eventDate = new Date(e.timestamp)
      const newDate = new Date(newEvidence.timestamp || Date.now())
      const daysDiff = Math.abs((eventDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return daysDiff < 7 && this.eventsContradict(e, newEvidence)
    })

    for (const existing of recentContradictoryEvents) {
      const contradictionScore = 0.8 // High confidence for contradictory recent events

      contradictions.push({
        has_contradiction: true,
        contradiction_type: 'episodic',
        confidence: contradictionScore,
        old_memory: existing,
        new_evidence: newEvidence,
        resolution_strategy: 'create_both', // Keep both as they happened at different times
        recommended_confidence_adjustment: {
          old_memory_confidence: existing.confidence, // Don't change episodic
          new_evidence_confidence: newEvidence.confidence || 0.5
        },
        explanation: `User experienced "${existing.event_type}" recently, but new evidence suggests "${newEvidence.event_type}" - both may be valid as sequential events`
      })
    }

    return contradictions
  }

  private async detectCrossLayerContradictions(
    existingMemories: { semantic: any[]; behavioral: any[]; episodic: any[] },
    newEvidence: any
  ): Promise<ContradictionResult[]> {
    const contradictions: ContradictionResult[] = []

    // Check if new semantic evidence contradicts behavioral patterns
    if (newEvidence.trait) {
      for (const behavior of existingMemories.behavioral) {
        const crossContradiction = this.calculateCrossLayerContradiction(
          newEvidence,
          behavior,
          'semantic_to_behavioral'
        )

        if (crossContradiction >= this.contradiction_threshold) {
          contradictions.push({
            has_contradiction: true,
            contradiction_type: 'cross_layer',
            confidence: crossContradiction,
            old_memory: behavior,
            new_evidence: newEvidence,
            resolution_strategy: 'merge',
            recommended_confidence_adjustment: {
              old_memory_confidence: behavior.confidence * 0.8,
              new_evidence_confidence: (newEvidence.confidence || 0.5) * 0.9
            },
            explanation: `New semantic trait "${newEvidence.trait}" contradicts established behavioral pattern "${behavior.behavior_type}"`
          })
        }
      }
    }

    // Check if new behavioral evidence contradicts semantic traits
    if (newEvidence.behavior_type) {
      for (const trait of existingMemories.semantic) {
        const crossContradiction = this.calculateCrossLayerContradiction(
          newEvidence,
          trait,
          'behavioral_to_semantic'
        )

        if (crossContradiction >= this.contradiction_threshold) {
          contradictions.push({
            has_contradiction: true,
            contradiction_type: 'cross_layer',
            confidence: crossContradiction,
            old_memory: trait,
            new_evidence: newEvidence,
            resolution_strategy: 'merge',
            recommended_confidence_adjustment: {
              old_memory_confidence: trait.confidence * 0.8,
              new_evidence_confidence: (newEvidence.confidence || 0.5) * 0.9
            },
            explanation: `New behavioral pattern "${newEvidence.behavior_type}" contradicts established semantic trait "${trait.trait}"`
          })
        }
      }
    }

    return contradictions
  }

  private calculateSemanticContradiction(
    oldValue: string,
    newValue: string,
    traitType: string
  ): number {
    // Calculate contradiction score based on semantic opposition
    
    // Direct contradictions
    const oppositionPairs: Record<string, string[]> = {
      motivation: ['low motivation', 'no motivation', 'demotivated'],
      confidence: ['doubtful', 'uncertain', 'insecure'],
      discipline: ['undisciplined', 'disorganized', 'lazy']
    }

    // Check if values are direct opposites
    const opposites = oppositionPairs[traitType] || []
    if (opposites.some(op => newValue.toLowerCase().includes(op))) {
      return 0.9 // Strong contradiction
    }

    // Check if values are similar (no contradiction)
    if (oldValue.toLowerCase() === newValue.toLowerCase()) {
      return 0.0 // No contradiction
    }

    // Check partial overlap
    const overlap = this.calculateSemanticOverlap(oldValue, newValue)
    if (overlap > 0.6) {
      return 0.1 // Weak contradiction (complementary)
    }

    return 0.5 // Moderate contradiction
  }

  private calculateBehavioralContradiction(
    oldObservation: string,
    newObservation: string,
    behaviorType: string
  ): number {
    // Calculate contradiction based on behavioral incompatibility
    
    const incompatibleBehaviors: Record<string, string[]> = {
      consistency: ['inconsistent', 'irregular', 'sporadic'],
      procrastination: ['immediate action', 'no delay', 'fast execution'],
      response_to_pressure: ['no pressure response', 'pressure insensitive']
    }

    const incompatible = incompatibleBehaviors[behaviorType] || []
    if (incompatible.some(inc => newObservation.toLowerCase().includes(inc))) {
      return 0.85 // Strong contradiction
    }

    // Check if observations are compatible
    if (this.behaviorsCompatible(oldObservation, newObservation)) {
      return 0.0
    }

    return 0.4 // Moderate contradiction
  }

  private eventsContradict(existing: any, newEvidence: any): boolean {
    // Check if events are logically contradictory
    const contradictoryPairs = [
      ['milestone', 'failure'],
      ['win', 'failure'],
      ['behavior_change', 'stable']
    ]

    return contradictoryPairs.some(([type1, type2]) =>
      (existing.event_type === type1 && newEvidence.event_type === type2) ||
      (existing.event_type === type2 && newEvidence.event_type === type1)
    )
  }

  private calculateCrossLayerContradiction(
    evidence1: any,
    evidence2: any,
    direction: 'semantic_to_behavioral' | 'behavioral_to_semantic'
  ): number {
    // Calculate contradiction between different memory layers
    
    // Semantic "disciplined" + Behavioral "procrastination" = contradiction
    if (direction === 'semantic_to_behavioral') {
      if (evidence1.trait === 'personality_trait' && 
          evidence1.value.toLowerCase().includes('disciplined') &&
          evidence2.behavior_type === 'procrastination_pattern') {
        return 0.8
      }
    }

    if (direction === 'behavioral_to_semantic') {
      if (evidence2.trait === 'personality_trait' &&
          evidence2.value.toLowerCase().includes('disciplined') &&
          evidence1.behavior_type === 'procrastination_pattern') {
        return 0.8
      }
    }

    return 0.3 // Low contradiction by default
  }

  private calculateSemanticOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  private behaviorsCompatible(obs1: string, obs2: string): boolean {
    // Check if behaviors are compatible
    const compatiblePairs = [
      ['consistent', 'regular'],
      ['improving', 'getting better'],
      ['stable', 'consistent']
    ]

    return compatiblePairs.some(([comp1, comp2]) =>
      obs1.toLowerCase().includes(comp1) && obs2.toLowerCase().includes(comp2)
    )
  }

  private determineResolutionStrategy(
    oldConfidence: number,
    newConfidence: number,
    contradictionScore: number
  ): ContradictionResult['resolution_strategy'] {
    // Determine how to resolve contradiction based on confidence and severity
    
    if (oldConfidence > newConfidence + 0.2) {
      return 'strengthen_old'
    } else if (newConfidence > oldConfidence + 0.2) {
      return 'strengthen_new'
    } else if (contradictionScore > 0.8) {
      return 'decay_both'
    } else if (oldConfidence > 0.6 && newConfidence > 0.6) {
      return 'create_both'
    } else {
      return 'merge'
    }
  }

  private calculateAdjustedConfidence(
    currentConfidence: number,
    direction: 'increase' | 'decrease',
    severity: number
  ): number {
    const adjustment = severity * 0.3 // 30% max adjustment
    
    if (direction === 'increase') {
      return Math.min(1.0, currentConfidence + adjustment)
    } else {
      return Math.max(0.01, currentConfidence - adjustment)
    }
  }
}

class ContradictionResolver {
  private supabase: any
  private detector: ContradictionDetector

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.detector = new ContradictionDetector(supabaseUrl, supabaseKey)
  }

  /**
   * Detect and resolve contradictions in a single operation
   */
  async resolveContradictions(
    userId: string,
    newEvidence: any,
    conversationContext?: any[]
  ): Promise<{
    resolved: boolean
    contradictions: ContradictionResult[]
    evolutions: MemoryEvolution[]
  }> {
    // Detect contradictions
    const contradictions = await this.detector.detectContradictions(
      userId,
      newEvidence,
      conversationContext
    )

    if (contradictions.length === 0) {
      return { resolved: false, contradictions: [], evolutions: [] }
    }

    const evolutions: MemoryEvolution[] = []

    // Resolve each contradiction
    for (const contradiction of contradictions) {
      const evolution = await this.applyResolution(
        userId,
        contradiction
      )
      if (evolution) {
        evolutions.push(evolution)
      }
    }

    return {
      resolved: true,
      contradictions,
      evolutions
    }
  }

  private async applyResolution(
    userId: string,
    contradiction: ContradictionResult
  ): Promise<MemoryEvolution | null> {
    const { old_memory, new_evidence, resolution_strategy, recommended_confidence_adjustment } = contradiction

    let evolution: MemoryEvolution | null = null

    switch (resolution_strategy) {
      case 'strengthen_old':
        // Increase confidence in old memory, decrease new evidence
        evolution = await this.updateMemoryConfidence(
          old_memory.id,
          recommended_confidence_adjustment.old_memory_confidence,
          'contradiction'
        )
        break

      case 'strengthen_new':
        // Decrease confidence in old memory, increase new evidence
        evolution = await this.updateMemoryConfidence(
          old_memory.id,
          recommended_confidence_adjustment.old_memory_confidence,
          'contradiction'
        )
        break

      case 'merge':
        // Keep both with adjusted confidences
        evolution = await this.updateMemoryConfidence(
          old_memory.id,
          recommended_confidence_adjustment.old_memory_confidence,
          'contradiction'
        )
        break

      case 'decay_both':
        // Decrease confidence in both
        evolution = await this.updateMemoryConfidence(
          old_memory.id,
          recommended_confidence_adjustment.old_memory_confidence,
          'contradiction'
        )
        break

      case 'create_both':
        // Keep both without changes (they represent temporal change)
        break
    }

    // Log the resolution
    await this.logResolution(userId, contradiction)

    return evolution
  }

  private async updateMemoryConfidence(
    memoryId: string,
    newConfidence: number,
    reason: MemoryEvolution['change_reason']
  ): Promise<MemoryEvolution> {
    // Determine memory type from ID prefix or separate query
    const memoryType = await this.getMemoryType(memoryId)

    // Update the memory
    const tableName = `${memoryType}_memories`
    const { data: current } = await this.supabase
      .from(tableName)
      .select('confidence')
      .eq('id', memoryId)
      .single()

    const { error } = await this.supabase
      .from(tableName)
      .update({ confidence: newConfidence })
      .eq('id', memoryId)

    if (error) {
      console.error('Failed to update memory confidence:', error)
      throw error
    }

    // Create evolution record
    const evolution: MemoryEvolution = {
      memory_id: memoryId,
      memory_type: memoryType,
      confidence_before: current.confidence,
      confidence_after: newConfidence,
      change_reason: reason,
      timestamp: new Date().toISOString(),
      metadata: {
        table: tableName
      }
    }

    await this.supabase.from('memory_evolution').insert(evolution)

    return evolution
  }

  private async getMemoryType(memoryId: string): Promise<'episodic' | 'semantic' | 'behavioral'> {
    // Simple type detection based on ID format or prefix
    // In production, would query appropriate tables
    return 'semantic' // Default fallback
  }

  private async logResolution(userId: string, contradiction: ContradictionResult): Promise<void> {
    try {
      await this.supabase.from('contradiction_resolutions').insert({
        user_id: userId,
        contradiction_type: contradiction.contradiction_type,
        resolution_strategy: contradiction.resolution_strategy,
        explanation: contradiction.explanation,
        confidence: contradiction.confidence,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log resolution:', error)
      // Don't fail the operation if logging fails
    }
  }

  /**
   * Get contradiction history for a user
   */
  async getContradictionHistory(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('contradiction_resolutions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to get contradiction history:', error)
      return []
    }

    return data || []
  }
}

export { ContradictionDetector, ContradictionResolver }
export type { ContradictionResult, MemoryEvolution }
