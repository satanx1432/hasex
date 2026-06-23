# Adaptive Memory System - Quick Start Guide

## 🚀 Quick Integration

### Step 1: Run the Database Schema

```sql
-- Run the schema file in Supabase SQL editor
-- src/lib/memory/system_schema.sql
```

### Step 2: Initialize Memory System

```typescript
// In your chat component or API route
import { createAdaptiveMemory } from '@/lib/memory'

const memorySystem = createAdaptiveMemory(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  userId
)
```

### Step 3: Process Conversations

```typescript
// In your chat handler
async function handleUserMessage(userQuery: string, conversationHistory: any[]) {
  const { response, personalization_level } = 
    await memorySystem.processConversation(
      conversationId,
      userQuery,
      conversationHistory,
      async (context, query) => {
        // Use your existing AI generation
        return await generateAIResponse(context, query)
      }
    )
  
  return response
}
```

## 🔧 Integration Points

### 1. Replace Existing Chat Handler

**Before:**
```typescript
async function generateResponse(query: string) {
  const response = await aiModel.generate(query)
  return response
}
```

**After:**
```typescript
async function generateResponse(query: string, conversationHistory: any[]) {
  const { response, context_used } = await memorySystem.processConversation(
    conversationId,
    query,
    conversationHistory,
    async (context, query) => {
      const systemPrompt = buildMemoryEnhancedPrompt(context)
      return await aiModel.generateWithSystemPrompt(query, systemPrompt)
    }
  )
  return response
}
```

### 2. Add Memory Insights to UI

```typescript
// Get user understanding for display
const userUnderstanding = await memorySystem.getUserUnderstanding(
  conversationId,
  conversationHistory,
  userQuery
)

// Display in your UI
<div className="memory-insights">
  <h3>What we know about you:</h3>
  <p>{userUnderstanding.who_is_user}</p>
  <p>{userUnderstanding.how_do_they_act}</p>
</div>
```

### 3. Monitor Memory Growth

```typescript
// Check personalization level
const personalizationLevel = await memorySystem.getPersonalizationLevel()

if (personalizationLevel === 'low') {
  // Show "we're just getting to know you" message
} else if (personalizationLevel === 'medium') {
  // Show "we're learning your patterns" message
} else {
  // Show "we understand you well" message
}
```

## 📊 Monitoring and Debugging

### Check Memory System Health

```typescript
import { validateMemorySystem } from '@/lib/memory/testing'

const { validation, test_results } = await validateMemorySystem(
  supabaseUrl,
  supabaseKey,
  userId
)

console.log('System healthy:', validation.overall_passed)
console.log('Test score:', test_results.overall_score)
console.log('Memory growth:', test_results.validation_metrics.memory_growth)
```

### View Current Memory Profile

```typescript
const userProfile = await memorySystem.getUserProfile()

console.log('Traits:', userProfile.semantic_traits)
console.log('Behaviors:', userProfile.behavioral_patterns)
console.log('Recent events:', userProfile.recent_events)
```

## 🎯 Common Use Cases

### Use Case 1: Adaptive Difficulty Adjustment

```typescript
async function adjustChallengeDifficulty(goalId: string) {
  const userProfile = await memorySystem.getUserProfile()
  
  const consistency = userProfile.behavioral_patterns.find(
    p => p.behavior_type === 'consistency'
  )
  
  if (consistency?.confidence > 0.7 && consistency.trend === 'improving') {
    // Increase difficulty
    return 'hard'
  } else if (consistency?.confidence < 0.4) {
    // Decrease difficulty
    return 'easy'
  } else {
    // Maintain difficulty
    return 'medium'
  }
}
```

### Use Case 2: Predictive Intervention

```typescript
async function predictUserStruggle(userId: string) {
  const userProfile = await memorySystem.getUserProfile()
  
  const abandonmentPattern = userProfile.behavioral_patterns.find(
    p => p.behavior_type === 'abandonment_pattern'
  )
  
  if (abandonmentPattern?.confidence > 0.6) {
    // User likely to quit at specific stage
    return {
      will_struggle: true,
      intervention_point: abandonmentPattern.observation,
      confidence: abandonmentPattern.confidence
    }
  }
  
  return { will_struggle: false }
}
```

### Use Case 3: Personalized Coaching Style

```typescript
async function getCoachingStyle(userId: string) {
  const userProfile = await memorySystem.getUserProfile()
  
  const coachingStyle = userProfile.semantic_traits.find(
    t => t.trait === 'coaching_style'
  )
  
  if (coachingStyle?.confidence > 0.7) {
    return coachingStyle.value // "direct", "supportive", "challenging"
  }
  
  return 'adaptive' // Default
}
```

## 🔒 Security Considerations

### 1. User Privacy
- All memories are user-scoped via RLS policies
- Memory data is isolated per user
- No cross-user memory sharing

### 2. Data Retention
- Old memories decay but aren't deleted
- Episodic memories older than 90 days can be archived
- Semantic memories with low confidence can be pruned

### 3. API Security
- Use Supabase RLS to restrict memory access
- Memory operations require authentication
- Admin access for debugging only

## 🚨 Common Issues and Solutions

### Issue: No memories being created

**Solution:**
```typescript
// Check if extraction agent is working
const extractionResults = await extractionAgent.extractFromConversation(
  conversationId,
  userId,
  messages
)

console.log('Extraction results:', extractionResults)
```

### Issue: Contradictions not being detected

**Solution:**
```typescript
// Check contradiction detection
const contradictions = await contradictionResolver.resolveContradictions(
  userId,
  newEvidence,
  conversationContext
)

console.log('Contradictions found:', contradictions.contradictions.length)
```

### Issue: Memory retrieval is slow

**Solution:**
```typescript
// Reduce max_memories in retrieval config
const memories = await retriever.retrieveMemories(userId, query, {
  max_memories: 20, // Reduced from 50
  min_confidence: 0.5 // Increased from 0.3
})
```

## 📈 Performance Optimization

### 1. Batch Processing
```typescript
// Process multiple conversations in batches
async function processBatch(conversations: any[]) {
  const results = await Promise.all(
    conversations.map(conv => 
      memorySystem.processConversation(conv.id, conv.query, conv.history)
    )
  )
  return results
}
```

### 2. Caching
```typescript
// Cache user profile for short duration
let profileCache = new Map()

async function getCachedProfile(userId: string) {
  if (profileCache.has(userId)) {
    return profileCache.get(userId)
  }
  
  const profile = await memorySystem.getUserProfile()
  profileCache.set(userId, profile)
  
  // Invalidate after 5 minutes
  setTimeout(() => profileCache.delete(userId), 5 * 60 * 1000)
  
  return profile
}
```

### 3. Lazy Loading
```typescript
// Only load memory system when needed
let memorySystemInstance = null

async function getMemorySystem() {
  if (!memorySystemInstance) {
    memorySystemInstance = createAdaptiveMemory(
      supabaseUrl,
      supabaseKey,
      userId
    )
  }
  return memorySystemInstance
}
```

## 🧪 Testing Your Integration

### Unit Test
```typescript
test('memory system initializes correctly', async () => {
  const memorySystem = createAdaptiveMemory(supabaseUrl, supabaseKey, userId)
  const profile = await memorySystem.getUserProfile()
  expect(profile).toBeDefined()
})
```

### Integration Test
```typescript
test('memory system processes conversation', async () => {
  const result = await memorySystem.processConversation(
    'test-conv',
    'How do I improve my coding?',
    [{ role: 'user', content: 'I want to code better' }],
    mockAIResponse
  )
  
  expect(result.response).toBeDefined()
  expect(result.context_used.retrieved_memories).toBeGreaterThanOrEqual(0)
})
```

### End-to-End Test
```typescript
test('full conversation flow with memory', async () => {
  // Simulate 10 conversations
  for (let i = 0; i < 10; i++) {
    await memorySystem.processConversation(
      `conv-${i}`,
      `Query ${i}`,
      conversationHistory,
      mockAIResponse
    )
  }
  
  // Check that memory improved
  const profile = await memorySystem.getUserProfile()
  expect(profile.semantic_traits.length).toBeGreaterThan(0)
  expect(profile.behavioral_patterns.length).toBeGreaterThan(0)
})
```

## 🎯 Next Steps

1. **Run database schema** - Execute `system_schema.sql` in Supabase
2. **Integrate with chat** - Replace existing chat handler
3. **Test basic functionality** - Run validation tests
4. **Monitor memory growth** - Check metrics over time
5. **Optimize performance** - Add caching, batch processing
6. **Enhance extraction** - Improve pattern detection
7. **Add UI components** - Show memory insights to users

## 📞 Support

For issues or questions:
1. Check the main README for architecture details
2. Review testing framework for debugging
3. Check console logs for error messages
4. Validate database schema is properly installed

---

**Remember: The memory system makes conversation #100 better than conversation #1 through actual learning, not better prompts.**
