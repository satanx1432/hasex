# Hybrid Model Router Implementation

## 🎯 What Was Built

**Hybrid Model Router** that intelligently routes AI requests to the best model for the task (GLM 5.1, Kimi K2.6, or Nemotron 550B).

---

## 📋 Architecture

### Model Router (`src/lib/ai/model-router.ts`)

**Routes to:**
- **GLM 5.1** - Structured outputs, goal analysis, planning, user profiling, reliable instruction following
- **Kimi K2.6** - Long context, conversational memory, large histories, natural discussions
- **Nemotron 550B** - Deep reasoning, complex planning, multi-step analysis, difficult edge cases

**Routing Logic:**
- **Task-based routing** → GLM for structured tasks, Kimi for conversation, Nemotron for complex tasks
- **Context-based routing** → Kimi when context exceeds threshold
- **Complexity-based routing** → Nemotron when reasoning complexity is high
- **Default** → GLM 5.1

---

## 🔄 Initial User Flow

### Step 1: User Enters Goal
**Trigger:** New goal expression detected (e.g., "I want to become...")

### Step 2: Ask ONLY ONE Question
**Question:** "How much time can you realistically commit each week, and what resources do you already have?"

**Resources include:** money, skills, mentors, equipment, network, prior experience

**Important:** No unrelated questions, no surveys

### Step 3: Route to GLM 5.1
**GLM infers:**
1. User's true destination
2. Why they want it
3. Likely bottlenecks
4. First milestone
5. Today's highest leverage action
6. Success probability (0-100)
7. Initial profile (motivation, strengths, weaknesses, coaching style)

### Output Format
```
Destination
- Main goal
- Why it matters
- Current stage
- Next milestone
- Success probability

Today's Action
- Single highest leverage action

Profile
- Motivation
- Strengths
- Weaknesses
- Biggest bottleneck
- Coaching style

Chat
- Continue naturally
- Ask follow-up questions ONLY if confidence is low
```

---

## 🔧 Implementation

### Goal Flow Manager (`src/lib/ai/goal-flow.ts`)

**Features:**
- Detects new goal expressions automatically
- Manages the 2-step flow (goal → resources)
- Routes to appropriate model
- Parses AI response into structured data
- Stores goal in database
- Creates first daily mission
- Returns formatted analysis for display

### Integration with Chat Screen

**Modified:** `src/app/(app)/chat/page.tsx`

**Features:**
- Detects new goal expressions automatically
- Shows resource input prompt
- Displays formatted goal analysis
- Updates current goal and today's action
- Resets to normal conversation flow after analysis

---

## 🚀 Usage Example

**User says:** "I want to become socially confident."

**AI responds:** "How much time can you realistically commit each week, and what resources do you already have?"

**User says:** "I can commit 5 hours per week. I have no money but I'm comfortable talking to people."

**AI (via GLM 5.1) responds:**
```
🎯 Destination

**Goal:** Become socially confident
**Why it matters:** Personal growth and connection with others
**Current stage:** Starting social skill development
**Next milestone:** Complete 10 social interactions this week
**Success probability:** 65%

⚡ Today's Action

Initiate 3 brief conversations with strangers or acquaintances

👤 Your Profile

**Motivation:** Personal growth and connection
**Strengths:** Comfortable with people, motivated
**Weaknesses:** Limited time, no budget for courses
**Biggest bottleneck:** Taking the first step
**Coaching style:** Encouragement with accountability
```

---

## 🎯 Routing Rules Summary

**Route to GLM 5.1 when:**
- User enters a new goal
- User asks for roadmap
- User asks for milestones
- User asks for daily actions
- User asks for structured plans
- User profile needs updating

**Route to Kimi K2.6 when:**
- Conversation exceeds large context
- User references many previous chats
- User wants long discussions
- User explores ideas deeply

**Route to Nemotron 550B when:**
- Problem is highly complex
- User requests deep analysis
- Multiple conflicting goals exist
- Strategic life planning required
- User asks for difficult reasoning

**Default:** GLM 5.1 (unless context_length > threshold OR reasoning_complexity > threshold)

---

## 🎓 Philosophy

**The product is NOT:**
- ChatGPT + RAG + Tasks
- Generic AI wrapper
- Prompt engineering alone

**The product IS:**
- AI that understands who the user wants to become
- AI that knows why they are stuck
- AI that tells them exactly what to do today
- AI that adapts coaching over time

**Success Metric:**
User should think:
"I typed one goal."
"The AI understood me."
"It showed me where I'm going."
"And it gave me a reason to come back tomorrow."

---

## 📊 Files Created

1. **`src/lib/ai/model-router.ts`** (234 lines)
   - Model routing logic
   - Task type detection
   - Context threshold management
   - Complexity analysis
   - Helper functions for common routing scenarios

2. **`src/lib/ai/goal-flow.ts`** (304 lines)
   - Initial user flow implementation
   - Goal detection logic
   - AI model integration
   - Response parsing
   - Database storage
   - Chat screen integration

3. **Modified:** `src/app/(app)/chat/page.tsx`
   - Added new goal detection
   - Added resource input prompt
   - Added formatted analysis display
   - Added goal flow state management

---

## 🚀 Ready for Integration

The hybrid model router is now integrated with:
- ✅ Chat screen for new goal entry
- ✅ Core metrics system for tracking
- ✅ AI observations for intelligence
- ✅ Memory system for context (when integrated)
- ✅ NVIDIA NIM service for model access

**Next:** Users can type a goal and get immediate, intelligent analysis without surveys or forms.
