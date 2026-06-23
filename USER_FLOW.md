# SIMPLIFIED USER FLOW - ONE PAGE APP

## CORE PHILOSOPHY

**Reduce to:**
```
OPEN → ONE CHALLENGE → COMPLETE → NEXT CHALLENGE
```

## USER FLOW

### FLOW 1: FIRST TIME USER

```
1. User opens app
2. Sees: "What do you want to become?"
3. Types: "Become a programmer"
4. AI says: "First step: Write your first line of code"
5. User clicks: "I'm in"
6. AI gives: 15-minute coding challenge
7. User completes
8. AI says: "You started. Tomorrow: Code for 20 minutes"
9. User leaves

10. Next day: User opens app
11. AI says: "You said you'd code 20 minutes. Can you?"
12. User: "Yes" → Challenge
13. User: "No" → AI adapts immediately
```

### FLOW 2: RETURNING USER

```
1. User opens app
2. AI says: "Hey [Name]. Yesterday: [what they did]"
3. AI says: "Today: [ONE SPECIFIC CHALLENGE]"
4. User: [COMPLETES or ADAPTS]
5. AI says: [EVIDENCE OF CHANGE]
6. AI says: "Tomorrow: [NEXT CHALLENGE]"
```

### FLOW 3: USER STUCK

```
1. User opens app
2. AI gives challenge
3. User says: "Can't do this"
4. AI says: "Why?"
5. User: [EXPLAINS]
6. AI says: "Let's try something easier"
7. AI gives: [SIMPLIFIED VERSION]
8. User completes
9. AI says: "You showed up. That counts. Tomorrow: [ORIGINAL GOAL]"
```

### FLOW 4: USER ASKS QUESTIONS

```
1. User opens app
2. User types: "Why am I doing this?"
3. AI says: "Remember: [ORIGINAL GOAL]"
4. AI says: "This challenge: [CONNECTION TO GOAL]"
5. AI says: "Want to keep going or change goal?"
```

### FLOW 5: USER QUITS

```
1. User opens app
2. User says: "I want to stop"
3. AI says: "That's your choice"
4. AI says: "Why?"
5. User: [EXPLAINS]
6. AI says: "I get it"
7. AI says: "Come back if you change your mind"
8. System: [ARCHIVES DATA, STOPS CHALLENGES]
```

## STATE MACHINE

**User States:**
1. `NEW_USER` - First time, needs goal
2. `ACTIVE_USER` - Has goal, getting challenges
3. `STUCK_USER` - Has goal, can't complete challenges
4. `PAUSED_USER` - Taking break
5. `QUIT_USER` - Left the system

**App States:**
1. `GOAL_SETTING` - Need to know what they want
2. `CHALLENGE_ACTIVE` - One challenge live
3. `CHALLENGE_COMPLETED` - Just finished one
4. `ADAPTATION` - AI learning from user
5. `REST` - No active challenge

**Transitions:**
```
NEW_USER + goal → ACTIVE_USER
ACTIVE_USER + challenge_complete → CHALLENGE_COMPLETED
ACTIVE_USER + challenge_fail → STUCK_USER
STUCK_USER + solved → ACTIVE_USER
STUCK_USER + too_long → PAUSED_USER
PAUSED_USER + return → ACTIVE_USER
QUIT_USER + return → NEW_USER
```

## CORE SCREEN (ONLY ONE SCREEN)

**The Coach Interface**

### STATE: GOAL_SETTING

```
┌─────────────────────────────────────┐
│                                     │
│  What do you want to become?        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │ [USER TYPES GOAL]           │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [CONTINUE]                        │
│                                     │
└─────────────────────────────────────┘
```

### STATE: CHALLENGE_ACTIVE

```
┌─────────────────────────────────────┐
│                                     │
│  Hey [Name].                       │
│                                     │
│  Today's challenge:                │
│                                     │
│  ⚡ [ONE SPECIFIC TASK]            │
│                                     │
│  [I'M IN] [NOT TODAY]              │
│                                     │
└─────────────────────────────────────┘
```

### STATE: CHALLENGE_IN_PROGRESS

```
┌─────────────────────────────────────┐
│                                     │
│  ⚡ [TASK DESCRIPTION]             │
│                                     │
│  [COMPLETE] [NEED HELP]            │
│                                     │
│  Timer: [TIME ELAPSED]             │
│                                     │
└─────────────────────────────────────┘
```

### STATE: CHALLENGE_COMPLETED

```
┌─────────────────────────────────────┐
│                                     │
│  🔥 You did it.                     │
│                                     │
│  Yesterday: [OLD STATE]            │
│  Today: [NEW STATE]                │
│                                     │
│  Tomorrow: [NEXT TASK]              │
│                                     │
│  [SEE YOU THEN]                     │
│                                     │
└─────────────────────────────────────┘
```

### STATE: ADAPTATION

```
┌─────────────────────────────────────┐
│                                     │
│  That didn't work. Let me adjust.    │
│                                     │
│  [EASIER VERSION] [SAME DIFFICULTY] │
│  [DIFFERENT APPROACH]               │
│                                     │
└─────────────────────────────────────┘
```

### STATE: CONTEXT_VIEW

(When user asks questions)

```
┌─────────────────────────────────────┐
│                                     │
│  [CHAT HISTORY]                     │
│                                     │
│  [TYPE MESSAGE]                      │
│                                     │
└─────────────────────────────────────┘
```

## MOBILE VS DESKTOP

**Mobile:**
- Full screen challenge
- Swipe gestures
- One-tap completion
- Immediate feedback
- Touch-friendly everything

**Desktop:**
- Chat remains central
- Challenge appears as card
- Keyboard shortcuts
- Slightly more context available
- Dark/light mode toggle

## KEY INTERACTION PATTERNS

1. **Pattern:** Open → Challenge → Complete
2. **Time:** Under 30 seconds to complete flow
3. **Action:** Always ONE primary button
4. **Feedback:** Immediate visual change
5. **Memory:** AI remembers everything, user doesn't need to

## THE OBSESSION LOOP

```
CURIOSITY → "What will it say today?"
→ CHALLENGE → "Can I do this?"
→ COMPLETION → "I changed"
→ EVIDENCE → "Show me more"
→ TOMORROW → "What's next?"
```

This loop creates daily return.
