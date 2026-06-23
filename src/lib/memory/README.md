# Adaptive Memory & User Modeling Engine

## 🎯 The Core Promise

**This system makes conversation #100 fundamentally better than conversation #1.**

Not because the AI is smarter, but because it actually learns and adapts to the specific user.

## 🚀 What Makes This Different

### ❌ NOT Another AI Wrapper

Most AI productivity apps are just:
- ChatGPT + Tasks + Roadmap + Some UI
- Better prompts + Fancy Dashboard
- No actual learning between conversations

### ✅ True Behavioral Intelligence

This system:
- Builds a living model of each user
- Answers the four critical questions before every response
- Adapts based on actual behavior, not just stated intentions
- Detects contradictions between what users say vs. do
- Evolves its understanding as users change over time

## 🏗️ Architecture

### Three Memory Layers

**1. Episodic Memory (What happened?)**
- Milestones, failures, wins, decisions
- Timestamped with importance scores
- Links related events together
- Decays over time but never fully forgets

**2. Semantic Memory (Who is this person?)**
- Goals, motivations, fears, strengths
- Personality traits, psychological bottlenecks
- Preferred coaching styles
- Confidence scores that strengthen/weaken with evidence

**3. Behavioral Memory (How do they act?)**
- Consistency patterns, procrastination tendencies
- Response to pressure, abandonment patterns
- Productive hours, successful/failed interventions
- Trend analysis (improving/stable/declining)

### The Intelligence Engine

**Post-Conversation Extraction Agent**
- Analyzes every conversation
- Detects memorable events
- Identifies behavioral patterns
- Evolves user understanding
- Never duplicates, always learns

**Confidence & Decay System**
- Every memory has confidence ∈ [0,1]
- Confidence decays over time (people change)
- Strengthens with supporting evidence
- Weakens with contrary evidence
- Resolves contradictions intelligently

**Contradiction Detection & Resolution**
- Detects when new evidence conflicts with old beliefs
- Compares evidence strength and confidence
- Updates beliefs without duplication
- Maintains history of changes
- Adapts when users genuinely change

**Memory Retrieval & Context Assembly**
- Vector similarity search across all memory layers
- Diversity filtering (don't retrieve similar memories)
- Confidence scoring for retrieval results
- Assembles complete context before AI response

## 🎯 The Four Critical Questions

Before generating any response, the AI must answer:

1. **What happened?** - Recent events, milestones, failures
2. **Who is this user?** - Traits, goals, motivations, fears
3. **How do they act?** - Behavioral patterns, consistency, response to pressure
4. **What intervention works?** - Successful/failed interventions, what has worked before

**If the AI cannot answer these four questions, it admits uncertainty and gathers more information.**

This prevents the system from becoming just ChatGPT + RAG + Vector Search.

## 📊 Usage Example

```typescript
import { createAdaptiveMemory } from './memory'

// Initialize memory system
const memorySystem = createAdaptiveMemory(
  supabaseUrl,
  supabaseKey,
  userId
)

// Process conversation with memory enhancement
const { response, context_used, personalization_level } = 
  await memorySystem.processConversation(
    conversationId,
    userQuery,
    conversationHistory,
    async (context, query) => {
      // Your AI generation function
      return await generateAIResponse(context, query)
    }
  )

console.log(`Response: ${response}`)
console.log(`Personalization level: ${personalization_level}`)
console.log(`Memories used: ${context_used.retrieved_memories}`)
```

## 🔧 Implementation Status

### ✅ Completed

- [x] Database schema for 3 memory layers
- [x] Post-conversation extraction agent
- [x] Confidence and decay system
- [x] Memory retrieval and context assembly
- [x] Contradiction detection and resolution
- [x] Integration with conversation system
- [x] Testing and validation framework

### 🚧 Needs Implementation

- [ ] Actual embedding model integration (BGE-M3)
- [ ] Vector similarity search in Supabase (pgvector setup)
- [ ] Database triggers for automatic decay
- [ ] Real AI model integration (Nemotron, GLM, Kimi)
- [ ] Production error handling and monitoring
- [ ] Performance optimization for large datasets

## 📁 File Structure

```
src/lib/memory/
├── index.ts                 # Main entry point
├── retrieval.ts             # Memory retrieval & context assembly
├── extraction.ts            # Post-conversation extraction
├── confidence_decay.ts      # Confidence & decay system
├── contradiction.ts         # Contradiction detection & resolution
├── integration.ts           # Conversation system integration
├── testing.ts               # Testing & validation framework
└── system_schema.sql        # Database schema
```

## 🗄️ Database Schema

The system requires the following Supabase tables:

- `episodic_memories` - Event-based memories
- `semantic_memories` - Trait-based memories
- `behavioral_memories` - Pattern-based memories
- `memory_evolution` - Track confidence changes
- `conversation_extractions` - Log extraction results
- `contradiction_resolutions` - Track contradiction handling
- `decay_jobs` - Schedule batch decay operations

See `system_schema.sql` for complete schema with indexes, triggers, and views.

## 🧪 Testing

```typescript
import { validateMemorySystem } from './memory/testing'

const { validation, test_results } = await validateMemorySystem(
  supabaseUrl,
  supabaseKey,
  userId
)

console.log('Validation passed:', validation.overall_passed)
console.log('Test score:', test_results.overall_score)
console.log('Memory growth:', test_results.validation_metrics.memory_growth)
```

## 🎯 Success Metrics

The system is successful when:

1. **Conversation Quality Improves**
   - Conversation #100 > Conversation #1
   - Measured by personalization level and memory usage

2. **Memory Growth**
   - System accumulates diverse memories over time
   - Memories evolve in confidence and accuracy

3. **Contradiction Handling**
   - System detects and resolves contradictions
   - User understanding adapts to genuine changes

4. **Prediction Accuracy**
   - System predicts user behavior better over time
   - Interventions become more effective

## 🔑 Key Design Principles

### 1. Beliefs Are Not Facts
- Every memory is a belief with confidence ∈ [0,1]
- Confidence changes with evidence
- Old beliefs don't dominate forever

### 2. People Change
- Confidence decays over time
- System adapts to genuine behavioral changes
- Contradictions are resolved, not ignored

### 3. Never Duplicate
- If evidence supports existing belief, strengthen it
- If evidence contradicts, resolve intelligently
- Maintain history, don't create duplicates

### 4. Intelligence Is Visible
- Show the AI's reasoning (four questions)
- Explain why recommendations are made
- Acknowledge uncertainty when appropriate

### 5. Action Over Information
- System optimizes for helping users act
- Not for showing them dashboards
- Every session ends with "Your next action"

## 🚀 Integration with Existing System

The memory system integrates with the existing Behavioral OS AI infrastructure:

- Uses existing AI models (Nemotron, GLM, Kimi) for extraction
- Integrates with existing Supabase setup
- Complements existing memory-system.ts (localStorage-based)
- Enhances existing adaptive-questioning.ts patterns

## 📝 Configuration

```typescript
export const MemorySystemConfig = {
  // Confidence thresholds
  RETRIEVAL_THRESHOLD: 0.3,
  ACTION_THRESHOLD: 0.7,
  STRONG_BELIEF_THRESHOLD: 0.85,
  WEAK_BELIEF_THRESHOLD: 0.3,
  CONTRADICTION_THRESHOLD: 0.7,

  // Decay settings
  BASE_DECAY_RATE: 0.95,
  DECAY_INTERVAL_DAYS: 1.0,
  MIN_CONFIDENCE: 0.01,

  // Strengthening/weakening rates
  STRENGTHEN_RATE: 0.1,
  WEAKEN_RATE: 0.2,

  // Retrieval settings
  MAX_MEMORIES: 50,
  TIME_FILTER_DAYS: 30,
  RELEVANCE_THRESHOLD: 0.7,
  DIVERSITY_FACTOR: 0.3
}
```

## 🎯 The Moat

The competitive advantage is not:
- ❌ Better prompts
- ❌ Fancy UI
- ❌ More features

The actual moat is:
- ✅ **Behavioral intelligence that accumulates over time**
- ✅ **User-specific understanding that can't be copied**
- ✅ **Prediction accuracy that improves with each conversation**
- ✅ **Contradiction detection that adapts to real change**

This makes the system:
- Harder to replace
- More personalized
- More accurate
- More trusted

## 🔮 Future Enhancements

1. **Offline Integration**
   - Calendar integration for time-based patterns
   - Task manager integration for completion tracking
   - Notification systems for optimal timing

2. **Network Effects**
   - Connect users with complementary skills
   - Create group challenges with shared goals
   - Provide real social proof

3. **Real-World Validation**
   - Strava integration for fitness tracking
   - GitHub integration for coding progress
   - Cross-reference claims vs. actual behavior

4. **Advanced ML**
   - Real predictive models for behavior
   - Pattern recognition at scale
   - Automatic intervention optimization

## 📚 References

- BGE-M3 Embeddings: https://github.com/FlagOpen/FlagEmbedding
- pgvector for Supabase: https://github.com/pgvector/pgvector
- Behavioral OS Project: Main application

## 🤝 Contributing

The memory system is designed to be modular and extensible. Key areas for contribution:

- Enhanced extraction algorithms
- Better contradiction detection patterns
- Advanced ML models for prediction
- Integration with external services
- Performance optimization

## 📄 License

Part of the Behavioral OS project.

---

**Remember: The goal is not to build a better chatbot. The goal is to build an AI that actually understands the specific user and helps them accomplish their goals in real life.**
