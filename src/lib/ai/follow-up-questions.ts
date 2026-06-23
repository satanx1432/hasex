import { NVIDIANIMService } from './nvidia-nim'

export interface FollowUpQuestion {
  id: string
  question_type: 'clarification' | 'assessment' | 'feedback' | 'cognitive_load'
  question_text: string
  answer_options?: string[]
  correct_answer?: string
  is_answered: boolean
  context?: string
  priority: number
}

export interface QuestionGenerationContext {
  goal: string
  user_history?: {
    completed_actions: number
    success_rate: number
    common_barriers: string[]
    recent_performance?: {
      success_rate: number
      recent_streak: number
      last_action_difficulty: number
      missed_actions: number
    }
  }
  current_task?: string
  previous_answers?: Array<{ question: string; answer: string }>
  assessment_type?: 'initial' | 'follow_up' | 'check_in' | 'struggle_detection'
}

export class FollowUpQuestionService {
  private nvidiaService: NVIDIANIMService

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
  }

  async generateAdaptiveQuestions(
    context: QuestionGenerationContext,
    numQuestions: number = 5
  ): Promise<FollowUpQuestion[]> {
    const systemPrompt = `You are a behavioral science expert specializing in adaptive questioning for goal achievement. Generate ${numQuestions} follow-up questions that will help understand the user's situation better and provide more personalized guidance.

Your questions should:
1. Be simple and direct (avoid complex language)
2. Focus on actionable information
3. Build on each other when possible
4. Mix of clarification, assessment, and context questions
5. Be appropriate for the assessment type

Question types:
- clarification: Understand user's situation better
- assessment: Evaluate user's current state
- feedback: Gather subjective information
- cognitive_load: Detect mental overwhelm

Return a JSON response with this structure:
{
  "questions": [
    {
      "question_type": "clarification|assessment|feedback|cognitive_load",
      "question_text": "Simple, direct question",
      "answer_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": null,
      "context": "Why this question matters",
      "priority": 1-5
    }
  ]
}`

    const userPrompt = this.buildContextPrompt(context)

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.7,
        2048
      )

      const parsed = JSON.parse(response)
      return parsed.questions.map((q: any, index: number) => ({
        ...q,
        id: `question_${Date.now()}_${index}`,
        is_answered: false,
      }))
    } catch (error) {
      console.error('Failed to generate follow-up questions:', error)
      return this.getFallbackQuestions(context, numQuestions)
    }
  }

  private buildContextPrompt(context: QuestionGenerationContext): string {
    let prompt = `Goal: "${context.goal}"\n`
    prompt += `Assessment type: ${context.assessment_type || 'general'}\n\n`

    if (context.user_history) {
      prompt += `User History:\n`
      prompt += `- Completed actions: ${context.user_history.completed_actions}\n`
      prompt += `- Success rate: ${context.user_history.success_rate}%\n`
      prompt += `- Common barriers: ${context.user_history.common_barriers.join(', ')}\n`

      if (context.user_history.recent_performance) {
        const rp = context.user_history.recent_performance
        prompt += `- Recent success rate: ${rp.success_rate}%\n`
        prompt += `- Current streak: ${rp.recent_streak} days\n`
        prompt += `- Last action difficulty: ${rp.last_action_difficulty}/10\n`
        prompt += `- Missed actions: ${rp.missed_actions}\n`
      }
    }

    if (context.current_task) {
      prompt += `\nCurrent task: "${context.current_task}"\n`
    }

    if (context.previous_answers && context.previous_answers.length > 0) {
      prompt += `\nPrevious answers:\n`
      context.previous_answers.forEach((qa, i) => {
        prompt += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`
      })
    }

    prompt += `\nGenerate ${Math.max(3, Math.min(5, context.previous_answers?.length || 0) + 2)} adaptive questions based on this context.`

    return prompt
  }

  private getFallbackQuestions(context: QuestionGenerationContext, numQuestions: number): FollowUpQuestion[] {
    const baseQuestions: FollowUpQuestion[] = [
      {
        id: 'fallback_1',
        question_type: 'clarification',
        question_text: 'What specific outcome are you trying to achieve with this goal?',
        answer_options: undefined,
        correct_answer: undefined,
        is_answered: false,
        context: 'Understanding the specific outcome helps tailor actions',
        priority: 5,
      },
      {
        id: 'fallback_2',
        question_type: 'assessment',
        question_text: 'How confident do you feel about making progress on this goal right now?',
        answer_options: ['Very confident', 'Somewhat confident', 'Not very confident', 'Not confident at all'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Current confidence level helps determine appropriate challenge',
        priority: 4,
      },
      {
        id: 'fallback_3',
        question_type: 'clarification',
        question_text: 'What time of day do you typically have the most energy for focused work?',
        answer_options: ['Morning', 'Afternoon', 'Evening', 'Late night'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Knowing peak energy times helps schedule tasks effectively',
        priority: 3,
      },
      {
        id: 'fallback_4',
        question_type: 'feedback',
        question_text: 'What has been the biggest challenge so far in working toward this goal?',
        answer_options: undefined,
        correct_answer: undefined,
        is_answered: false,
        context: 'Identifying barriers helps create targeted solutions',
        priority: 4,
      },
      {
        id: 'fallback_5',
        question_type: 'assessment',
        question_text: 'How much time can you realistically dedicate to this goal each day?',
        answer_options: ['Less than 15 minutes', '15-30 minutes', '30-60 minutes', 'More than 1 hour'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Time availability determines task complexity and frequency',
        priority: 5,
      },
    ]

    return baseQuestions.slice(0, numQuestions)
  }

  async generateNextQuestion(
    context: QuestionGenerationContext,
    previousQuestions: FollowUpQuestion[]
  ): Promise<FollowUpQuestion | null> {
    // If we've asked enough questions, stop
    if (previousQuestions.length >= 5) {
      return null
    }

    // Generate a single follow-up question based on previous answers
    const systemPrompt = `You are a behavioral science expert. Generate ONE follow-up question based on the user's previous answers. The question should:
1. Build on previous information
2. Fill in important gaps
3. Be simple and direct
4. Help provide better personalization

Return a JSON response with this structure:
{
  "question_type": "clarification|assessment|feedback|cognitive_load",
  "question_text": "Simple, direct question",
  "answer_options": ["Option 1", "Option 2", "Option 3", "Option 4"] or null,
  "context": "Why this question matters",
  "priority": 1-5
}`

    const userPrompt = this.buildContextPrompt({
      ...context,
      previous_answers: previousQuestions
        .filter(q => q.is_answered)
        .map(q => ({ question: q.question_text, answer: 'Answer provided' })),
    })

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.7,
        1024
      )

      const parsed = JSON.parse(response)
      return {
        ...parsed,
        id: `question_${Date.now()}`,
        is_answered: false,
      }
    } catch (error) {
      console.error('Failed to generate next question:', error)
      return null
    }
  }

  async generateCognitiveLoadQuestions(): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [
      {
        id: 'cognitive_1',
        question_type: 'cognitive_load',
        question_text: 'How difficult do you find it to focus on your tasks right now?',
        answer_options: ['Very easy', 'Somewhat easy', 'Somewhat difficult', 'Very difficult'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Assessing current focus difficulty',
        priority: 5,
      },
      {
        id: 'cognitive_2',
        question_type: 'cognitive_load',
        question_text: 'How many things are you trying to keep track of in your mind right now?',
        answer_options: ['Just one thing', '2-3 things', '4-5 things', 'Too many to count'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Measuring mental clutter',
        priority: 4,
      },
      {
        id: 'cognitive_3',
        question_type: 'cognitive_load',
        question_text: 'When you think about your tasks, how do you feel?',
        answer_options: ['Calm and in control', 'Mildly concerned', 'Overwhelmed', 'Extremely stressed'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Assessing emotional response to workload',
        priority: 5,
      },
      {
        id: 'cognitive_4',
        question_type: 'cognitive_load',
        question_text: 'How often do you find yourself forgetting important details or deadlines?',
        answer_options: ['Never', 'Rarely', 'Sometimes', 'Frequently'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Assessing memory and attention capacity',
        priority: 3,
      },
      {
        id: 'cognitive_5',
        question_type: 'cognitive_load',
        question_text: 'If you had to take on one more task right now, how would you react?',
        answer_options: ['No problem at all', 'A bit concerned but manageable', 'Would feel very stressed', 'Would feel completely overwhelmed'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Testing capacity for additional load',
        priority: 4,
      },
    ]

    return questions
  }

  calculateCognitiveLoadScore(answers: Array<{ question_id: string; answer: string }>): number {
    // Simple scoring algorithm - can be enhanced with AI
    let score = 0
    const maxScore = 100

    answers.forEach(({ answer }) => {
      // Map answers to scores (higher = more cognitive load)
      if (answer.includes('Very difficult') || answer.includes('Too many') || answer.includes('Extremely stressed') || answer.includes('Frequently') || answer.includes('completely overwhelmed')) {
        score += 25
      } else if (answer.includes('Somewhat difficult') || answer.includes('4-5') || answer.includes('Overwhelmed') || answer.includes('Sometimes') || answer.includes('very stressed')) {
        score += 15
      } else if (answer.includes('Somewhat easy') || answer.includes('2-3') || answer.includes('Mildly concerned') || answer.includes('Rarely') || answer.includes('concerned but manageable')) {
        score += 8
      }
      // Easy answers add 0
    })

    return Math.min(score, maxScore)
  }

  determineCognitiveLoadStatus(score: number): 'normal' | 'elevated' | 'overloaded' {
    if (score >= 70) return 'overloaded'
    if (score >= 40) return 'elevated'
    return 'normal'
  }
}

export const followUpQuestionService = new FollowUpQuestionService()