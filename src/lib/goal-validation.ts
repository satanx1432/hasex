interface ValidationResult {
  isValid: boolean
  error?: string
  suggestion?: string
  interpreted_goal?: string
  valid?: boolean
  confidence?: number
  needs_intent_confirmation?: boolean
  needs_followup?: boolean
  followup_question?: string
  reasoning?: string
  intent_suggestions?: string[]
}

class GoalValidator {
  private meaninglessInputs = [
    'hi', 'hello', 'bye', 'test', 'lol', 'ok', 'okay', 'yes', 'no', 'maybe', 
    'hey', 'hola', 'yo', 'sup', 'wassup', '...', ' ', '', 'test123', 'testing',
    'random', 'asdf', 'xyz'
  ]

  private nonActionablePatterns = [
    /^(to |to )?(marry|become|be|have|get|want|wish|hope)/i,
    /^(get rich|become rich|become famous|become cool|be happy|be successful)/i,
    /^(make money|earn money)$/i
  ]

  private offensivePatterns = [
    /\b(hate|kill|destroy|hurt|murder|rape|abuse|harass|sexual|nazi|hitler)\b/i,
    /\b(fuck|shit|bitch|cunt|nigger|nigga)\b/i
  ]

  private unrealisticPatterns = [
    /billionaire in \d+ (day|week|month)/i,
    /learn everything/i,
    /never fail/i,
    /perfect/i,
    /always win/i
  ]

  private actionVerbs = [
    'build', 'learn', 'exercise', 'study', 'write', 'save', 'practice', 'create',
    'launch', 'improve', 'read', 'develop', 'start', 'finish', 'complete', 'achieve',
    'implement', 'deploy', 'design', 'code', 'run', 'grow', 'scale', 'master',
    'teach', 'train', 'cook', 'eat', 'sleep', 'meditate', 'organize', 'plan',
    'track', 'monitor', 'analyze', 'research', 'explore', 'discover', 'solve',
    'optimize', 'refactor', 'test', 'debug', 'deploy', 'maintain', 'document',
    'communicate', 'network', 'collaborate', 'lead', 'manage', 'delegate'
  ]

  validate(goal: string): ValidationResult {
    const trimmedGoal = goal.trim().toLowerCase()

    // 1. Check for empty or meaningless input
    if (!trimmedGoal || this.meaninglessInputs.includes(trimmedGoal) || trimmedGoal.length < 3) {
      return {
        isValid: false,
        valid: false,
        error: 'Please enter a meaningful goal you want to achieve.'
      }
    }

    // 2. Check for offensive or inappropriate language
    if (this.offensivePatterns.some(pattern => pattern.test(trimmedGoal))) {
      return {
        isValid: false,
        valid: false,
        error: 'Please enter a respectful goal focused on personal growth.'
      }
    }

    // 3. Check for non-actionable goals (outcomes)
    if (this.nonActionablePatterns.some(pattern => pattern.test(trimmedGoal))) {
      return {
        isValid: false,
        valid: false,
        error: 'This goal is an outcome, not an actionable goal.',
        suggestion: `❌ ${goal}

Try:
✅ Improve my social confidence
✅ Go on one date this month
✅ Build a side project`
      }
    }

    // 4. Check for impossible or unrealistic goals
    if (this.unrealisticPatterns.some(pattern => pattern.test(trimmedGoal))) {
      return {
        isValid: false,
        valid: false,
        error: 'This goal isn\'t specific or realistic enough.',
        suggestion: 'Try breaking it into something achievable in the next 30-90 days.'
      }
    }

    // 5. Check if goal contains an action verb
    const hasActionVerb = this.actionVerbs.some(verb => 
      trimmedGoal.includes(verb) || trimmedGoal.startsWith(verb)
    )

    const actionableNouns = [
      'startup', 'business', 'app', 'website', 'book', 'course', 'fitness',
      'python', 'javascript', 'coding', 'programming', 'design', 'marketing',
      'sales', 'finance', 'budget', 'habit', 'routine', 'system', 'process'
    ]

    if (!hasActionVerb) {
      const hasActionableNoun = actionableNouns.some(noun => trimmedGoal.includes(noun))
      
      if (!hasActionableNoun) {
return {
        isValid: false,
        valid: false,
        error: 'Please add an action verb to make your goal actionable.',
        suggestion: `Instead of "${goal}", try:
✅ Learn ${goal}
✅ Build ${goal}
✅ Improve ${goal}`
      }
      }
    }

    // 6. Check if goal is too vague (single word without context)
    if (trimmedGoal.split(' ').length === 1 && !actionableNouns.includes(trimmedGoal)) {
      return {
        isValid: false,
        valid: false,
        error: 'This goal is too vague.',
        suggestion: 'Add more context or break it down further.'
      }
    }

    // All checks passed
    return { isValid: true, valid: true, confidence: 100, interpreted_goal: goal }
  }

  // Helper to get suggested action verbs
  getSuggestedVerbs(goal: string): string[] {
    const trimmedGoal = goal.trim().toLowerCase()
    
    // Context-based suggestions
    if (trimmedGoal.includes('money') || trimmedGoal.includes('rich')) {
      return ['Build a side business', 'Start freelancing', 'Invest monthly']
    }
    
    if (trimmedGoal.includes('fit') || trimmedGoal.includes('health') || trimmedGoal.includes('weight')) {
      return ['Exercise 20 minutes daily', 'Run 3x per week', 'Eat healthy meals']
    }
    
    if (trimmedGoal.includes('learn') || trimmedGoal.includes('study')) {
      return ['Study for 30 min daily', 'Complete a course', 'Practice regularly']
    }
    
    if (trimmedGoal.includes('code') || trimmedGoal.includes('program')) {
      return ['Build a project', 'Contribute to open source', 'Create a portfolio']
    }

    return ['Build', 'Learn', 'Practice', 'Improve', 'Start']
  }
}

export const goalValidator = new GoalValidator()

export async function validateGoal(goal: string) {
  return goalValidator.validate(goal)
}