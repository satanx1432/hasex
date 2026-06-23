# WIREFRAMES & COMPONENT HIERARCHY - ONE PAGE APP

## CORE SCREEN: THE COACH

### MOBILE WIREFRAME (320pt width)

#### STATE: GOAL_SETTING

```
┌────────────────────────────────┐
│                                │
│        THE COACH               │
│                                │
├────────────────────────────────┤
│                                │
│  What do you want to become?  │
│                                │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │        [Input]           │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                                │
│  Examples:                    │
│  • Become a programmer        │
│  • Get in shape               │
│  • Start a business           │
│                                │
│        [CONTINUE]             │
│                                │
└────────────────────────────────┘
```

#### STATE: CHALLENGE_ACTIVE

```
┌────────────────────────────────┐
│                                │
│        THE COACH               │
│                                │
├────────────────────────────────┤
│                                │
│  Hey [Name].                  │
│                                │
│  Today's challenge:            │
│                                │
│  ⚡                            │
│                                │
│  [ONE SPECIFIC TASK]           │
│                                │
│  Time: 15 min                  │
│                                │
│  [I'M IN]     [NOT TODAY]      │
│                                │
│                                │
│  [Ask AI]                      │
│                                │
└────────────────────────────────┘
```

#### STATE: CHALLENGE_IN_PROGRESS

```
┌────────────────────────────────┐
│                                │
│  ⚡ [TASK TITLE]               │
│                                │
├────────────────────────────────┤
│                                │
│  [TASK DESCRIPTION]            │
│                                │
│  ├─ Step 1: [CHECKBOX]         │
│  ├─ Step 2: [CHECKBOX]         │
│  └─ Step 3: [CHECKBOX]         │
│                                │
│  Timer: 12:30 / 15:00         │
│                                │
│  [COMPLETE] [NEED HELP]        │
│                                │
└────────────────────────────────┘
```

#### STATE: COMPLETED

```
┌────────────────────────────────┐
│                                │
│         🔥                      │
│                                │
│  You did it.                   │
│                                │
│  Yesterday: [OLD STATE]        │
│  Today: [NEW STATE]            │
│                                │
│  You're becoming:               │
│  • [Trait 1]                    │
│  • [Trait 2]                    │
│                                │
│  Tomorrow:                      │
│  [NEXT TASK]                   │
│                                │
│      [SEE YOU THEN]            │
│                                │
└────────────────────────────────┘
```

### DESKTOP WIREFRAME (1200pt width)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    THE COACH                           │
│                                                         │
├────────────────────────────────┬───────────────────────┤
│                                │                       │
│  [CHAT HISTORY]               │   [CHALLENGE CARD]    │
│                                │                       │
│  [Oldest]                     │   ┌─────────────────┐  │
│  • AI: "Do X"                │   │                 │  │
│  • You: "Did it"              │   │  ⚡ [TASK]      │  │
│  • AI: "Nice"                │   │                 │  │
│  • You: "Thanks"              │   │  Time: 15min    │  │
│  • AI: "Do Y"                │   │                 │  │
│  • You: "Can't"               │   │  [I'M IN]        │  │
│  • AI: "Let's adjust"         │   │  [NOT TODAY]     │  │
│  • [Newest]                   │   │                 │  │
│                                │   └─────────────────┘  │
│                                │                       │
│  [TYPE MESSAGE]               │   [PROGRESS RING]     │
│                                │   30% to [GOAL]        │
│                                │                       │
└────────────────────────────────┴───────────────────────┘
```

## COMPONENT HIERARCHY

```
App
├── CoachScreen (main container)
│   ├── Header (app branding)
│   ├── MainContent (state-dependent)
│   │   ├── GoalSetting (when no goal)
│   │   ├── ChallengeCard (when challenge active)
│   │   ├── ChallengeProgress (when in progress)
│   │   ├── CompletionView (when completed)
│   │   ├── AdaptationView (when stuck)
│   │   └── ChatView (context queries)
│   ├── QuickActions (always available)
│   └── Footer (minimal)
```

## COMPONENT SPECIFICATIONS

### CoachScreen

**Props:**
```typescript
interface CoachScreenProps {
  user: User
  state: UserState
  challenge?: Challenge
  onAction: (action: UserAction) => void
}
```

**States:**
```typescript
type ScreenState = 
  | "goal_setting" 
  | "challenge_active" 
  | "challenge_in_progress" 
  | "challenge_completed" 
  | "adaptation" 
  | "context_chat"
```

### ChallengeCard

**Props:**
```typescript
interface ChallengeCardProps {
  challenge: Challenge
  onStart: () => void
  onSkip: () => void
  onAskHelp: () => void
}
```

**Visual:**
- Large emoji or icon (⚡, 🎯, 🏃, etc.)
- One primary task description (max 2 lines)
- Time estimate
- Difficulty indicator (easy/medium/hard)
- Two buttons: "I'M IN" (primary), "NOT TODAY" (secondary)

### ProgressRing

**Props:**
```typescript
interface ProgressRingProps {
  progress: number // 0-100
  goal: string
  completed: number
}
```

**Visual:**
- Circular progress indicator
- "30% to [GOAL]" text
- Shows change from yesterday

### CompletionView

**Props:**
```typescript
interface CompletionViewProps {
  completedChallenge: Challenge
  nextChallenge: Challenge
  evidenceOfChange: Evidence[]
}
```

**Visual:**
- Fire emoji 🔥
- "You did it" headline
- "Yesterday: X, Today: Y" comparison
- 2-3 traits developing
- Tomorrow's challenge preview
- "See you then" button

## DESIGN PRINCIPLES

### Mobile First
- Everything works on 320px width
- Touch targets minimum 44px
- One-thumb navigation
- No hover states needed

### Action First
- One primary action per screen
- Secondary actions hidden
- No modals, no popups
- Everything inline

### Feedback Immediate
- Complete action → See change immediately
- Typing message → AI responds instantly
- Skip challenge → AI adapts instantly
- Progress updates visible in real-time

### Emotional
- Use emoji for personality
- AI talks like a coach, not assistant
- Celebrate wins big
- Don't shame failures

## ANIMATION PATTERNS

### Transitions
```typescript
// Challenge appears
card: { opacity: 0, y: 20 }
card: { opacity: 1, y: 0 }

// Completion celebrates
fire: { scale: 0, rotate: -180 }
fire: { scale: 1.5, rotate: 0 }

// Challenge completes
checkmark: { scale: 0 }
checkmark: { scale: 1.2 } → { scale: 1 }
```

### Micro-interactions
- Button press: Scale 0.95
- Task complete: Confetti
- Streak: Numbers animate
- Progress: Ring fills smoothly

## RESPONSIVE BREAKPOINTS

```typescript
const breakpoints = {
  mobile: "320px",
  tablet: "768px", 
  desktop: "1200px"
}
```

**Mobile (320-767px):** Full screen, one element visible
**Tablet (768-1199px):** Side-by-side layout
**Desktop (1200px+):** Chat left, challenge right

## COMPONENT LIBRARY

### Typography
```typescript
const typography = {
  heading: "Inter, 28px, bold",
  body: "Inter, 16px, regular",
  button: "Inter, 14px, semibold"
}
```

### Colors
```typescript
const colors = {
  primary: "#000000",
  secondary: "#FFFFFF", 
  accent: "#FF6B35",
  success: "#4CAF50",
  warning: "#FFC107"
}
```

### Spacing
```typescript
const spacing = {
  xs: "4px",
  sm: "8px", 
  md: "16px",
  lg: "24px",
  xl: "32px"
}
```

### Border Radius
```typescript
const radius = {
  sm: "4px",
  md: "8px", 
  lg: "12px",
  xl: "16px"
}
```

## ICONOGRAPHY

**Used sparingly:**
- ⚡ Challenge
- 🔥 Fire (completion)
- 🎯 Goal
- 🏃 Progress
- 💡 Idea
- 💪 Strength
- 🌟 Achievement

**System:** Apple SF Symbols or similar emoji-first approach
