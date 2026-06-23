# EXACT UI COPY - ONE PAGE APP

## OVERVIEW

**Tone:** Direct, motivating, slightly unpredictable, coach-like
**Length:** Minimal. Short sentences. No fluff.
**Emotion:** Belief in user, urgency, celebration

## SCREEN: GOAL_SETTING

### Primary Copy

```
Header: "What do you want to become?"
Placeholder: "I want to become..."
Examples:
  • "Become a programmer"
  • "Get in shape" 
  • "Start a business"
  
Button: "Continue"
```

### Error Messages

```
Empty input: "Tell me something specific"
Too vague: "That's not specific enough. Try: 'Lose 10kg by December'"
```

## SCREEN: CHALLENGE_ACTIVE

### Primary Copy

```
Greeting: "Hey, [Name]."
Subheading: "Today's challenge"

Challenge title: [ONE SPECIFIC TASK]
Examples:
  • "Code for 15 minutes"
  • "Write 200 words"
  • "Run for 1 mile"
  • "Make 5 sales calls"

Button Primary: "I'M IN"
Button Secondary: "NOT TODAY"
Button Tertiary: "What's the point?"
```

### Challenge Types

**Easy (green accent):**
```
⚡ [Simple task]
Time: 10min
```

**Medium (yellow accent):**
```
🎯 [Moderate task]
Time: 30min
```

**Hard (orange accent):**
```
🏃 [Challenging task]
Time: 60min
```

### Context Messages

```
When user hasn't done challenges:
"First time? Let's start easy."

When user is on streak:
"On a 5-day streak. Keep it up."

When user struggled yesterday:
"Yesterday was tough. Today's different."
```

## SCREEN: CHALLENGE_IN_PROGRESS

### Primary Copy

```
Header: [CHALLENGE TITLE]
Description: [TASK DETAILS]

Steps:
• [Step 1: Specific action]
• [Step 2: Specific action]
• [Step 3: Specific action]

Timer: [TIME REMAINING]
Button: "COMPLETE"
Button: "NEED HELP"
```

### Help Messages

```
When user clicks "NEED HELP":
"Stuck? Let me make it easier."

When user takes too long:
"Taking a while. Want to break this into smaller steps?"

When user completes partially:
"You made progress. That counts. Finish the rest tomorrow?"
```

## SCREEN: CHALLENGE_COMPLETED

### Primary Copy

```
Header: "🔥 You did it."

Comparison:
"Yesterday: [OLD STATE]
Today: [NEW STATE]"

Trait Development:
"You're becoming:"
• [Trait 1]
• [Trait 2]

Tomorrow Section:
"Tomorrow: [NEXT TASK]"

Button: "See you then"
```

### Trait Examples

```
Disciplined → "You showed up when you didn't want to"
Consistent → "You've done this 5 days in a row"
Resilient → "You kept going when it got hard"
Curious → "You tried something different today"
Focused → "You finished what you started"
```

### Evidence Examples

```
Yesterday: "Can't write code"
Today: "Wrote 50 lines"
Trait: Becoming a builder

Yesterday: "Procrastinated"
Today: "Started immediately"
Trait: Becoming disciplined
```

## SCREEN: ADAPTATION

### Primary Copy

```
Header: "That didn't work."
Subheading: "Let me adjust."

Options:
"Easier version: [SIMPLER TASK]"
"Same difficulty: [DIFFERENT APPROACH]"
"Take a break: [PAUSE FOR X DAYS]"
```

### Struggle Messages

```
When user says "I can't":
"No worries. Why?"

When user explains:
"I get it. Let's try something else."

When user wants to break:
"Taking a break is smart. For how long?"

When user wants to quit:
"That's your choice. Are you sure?"
```

## SCREEN: CONTEXT_CHAT

### User Questions

```
"Why am I doing this?"
→ "Remember: [GOAL]. This challenge helps you get there."

"How long until I reach my goal?"
→ "Depends on you. If you show up every day: [ESTIMATE]. If you skip: [ESTIMATE]."

"Can I change my goal?"
→ "Yes. What's your new goal?"

"Who am I becoming?"
→ [Shows traits developing]
```

### AI Responses

```
Simple, direct:
"No fluff. Just answer."

If user asks for explanation:
"Short version. Want more?"

If user asks for motivation:
"You can do this. I believe it."
```

## BUTTONS & ACTIONS

### Primary Action Buttons

```
"I'M IN" - Start challenge
"COMPLETE" - Submit proof
"TRY AGAIN" - Retry challenge
"SEE YOU THEN" - Close completion view
```

### Secondary Action Buttons

```
"NOT TODAY" - Skip challenge
"NEED HELP" - Get assistance
"DIFFERENT APPROACH" - Alternative challenge
"TAKE A BREAK" - Pause goal
```

### Tertiary Actions

```
"What's the point?" - Context/meaning
"Change goal" - Modify objective
"See progress" - View evidence
```

## MESSAGES

### Success Messages

```
After completion:
"You didn't just complete a challenge. You changed."

After streak:
"7 days in a row. You're not the person who started."

After trait development:
"Yesterday you wouldn't. Today you did. That's real change."
```

### Failure Messages

```
After skip:
"Skipping today doesn't mean you failed. It means you're choosing not to today."

After incomplete:
"You showed up. That counts. Do a little bit more tomorrow."

After quit:
"If you change your mind, I'll be here."
```

### Motivation Messages

```
Morning:
"Good morning. Ready for today's challenge?"

Evening:
"Evening challenge. Want to end your day strong?"

Weekend:
"Weekend challenge. Most people rest. You don't have to."

Monday:
"Monday. Fresh start. Who will you be this week?"
```

## ERROR MESSAGES

### API Errors

```
"Something went wrong. Try again in a moment."
```

### Network Errors

```
"Can't connect. Check your internet."
```

### Database Errors

```
"Lost your data? I'll check. One moment."
```

## MICROCOPY

### Empty States

```
No challenges yet:
"No challenges yet. Set your goal first."

No evidence of change:
"Complete a challenge to see how you're changing."

No messages:
"No messages yet. Start a conversation."
```

### Loading States

```
"Loading challenge..."
"Generating your challenge..."
"Calculating your progress..."
```

### Progress Indicators

```
Timer: "12:30 / 15:00"
Progress: "2/3 steps completed"
Streak: "5 days"
Completion: "42% to goal"
```

## PERSONALIZATION

### User Names

```
Short: "Alex" → "Hey, Alex."
Full name: "Alexander" → "Hey, Alexander."
```

### Time-Based

```
Morning (6-12): "Good morning."
Afternoon (12-18): "Good afternoon."
Evening (18-22): "Evening challenge."
Night (22-6): "Late night challenge."
```

### Day-Based

```
Monday: "Fresh start."
Friday: "End strong."
Saturday: "Weekend mode."
Sunday: "Tomorrow's important."
```

## EXCLUSIONS

### What We DON'T Say

```
❌ "We believe in you"
❌ "You can do it!"
❌ "Just keep going"
❌ "One step at a time"
❌ "Everything in moderation"
❌ "It's the journey, not the destination"
❌ "Rome wasn't built in a day"
❌ "Progress, not perfection"
```

### What We DO Say

```
✅ "You did it."
✅ "You're changing."
✅ "You're becoming: [specific trait]"
✅ "Yesterday you couldn't. Today you can."
✅ "Show me you can do it again."
✅ "This will be different."
✅ "I believe in [specific action], not you in general"
```

## FORMATTING RULES

**Capitalization:**
- Sentence case for body text
- UPPERCASE for emphasis
- Title case for headings

**Punctuation:**
- Minimal punctuation
- Periods rarely
- Commas sparingly
- No exclamation marks unless celebrating

**Length:**
- Headlines: 2-6 words
- Body text: 5-15 words per sentence
- Buttons: 2-3 words
- Challenge titles: 3-8 words

This copy prioritizes action, belief, and evidence over motivation, fluff, and generic encouragement.
