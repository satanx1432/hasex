'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ============================================================================
// UX Question Types
// ============================================================================

export type QuestionType = 
  | 'rating'      // 1-5 star rating
  | 'yesno'       // Yes/No buttons
  | 'choice'       // Multiple choice
  | 'text'         // Free text input
  | 'scale'        // 1-10 scale
  | 'priority'     // Drag to prioritize
  | 'feedback'     // Detailed feedback with categories

export interface UxQuestion {
  id: string
  type: QuestionType
  title: string
  description?: string
  placeholder?: string
  options?: string[]
  required?: boolean
  category?: string
  priority?: number // Lower = shown first
}

export interface UxAnswer {
  questionId: string
  value: string | number | string[] | boolean
  timestamp: number
  metadata?: Record<string, any>
}

export interface UxQuestionnaire {
  id: string
  title: string
  description?: string
  questions: UxQuestion[]
  onComplete?: (answers: UxAnswer[]) => void
  onSkip?: () => void
  showProgress?: boolean
  allowSkip?: boolean
}

// ============================================================================
// Pre-built UX Questionnaires for Common Issues
// ============================================================================

export const UX_QUESTIONNAIRES = {
  // Onboarding feedback
  onboarding_feedback: {
    id: 'onboarding_feedback',
    title: 'Quick Feedback',
    description: 'Help us improve your experience',
    showProgress: true,
    allowSkip: true,
    questions: [
      {
        id: 'onboarding_clarity',
        type: 'rating',
        title: 'How clear was the onboarding process?',
        description: 'Rate from 1 (very confusing) to 5 (very clear)',
        category: 'onboarding',
        priority: 1,
      },
      {
        id: 'onboarding_difficulty',
        type: 'scale',
        title: 'How difficult was it to get started?',
        description: '1 = Very Easy, 10 = Very Difficult',
        category: 'onboarding',
        priority: 2,
      },
      {
        id: 'onboarding_features',
        type: 'choice',
        title: 'What was most confusing?',
        options: [
          'Account creation',
          'Navigation',
          'Understanding features',
          'Connecting integrations',
          'Nothing - it was clear',
        ],
        category: 'onboarding',
        priority: 3,
      },
    ],
  },

  // Goal setting feedback
  goal_feedback: {
    id: 'goal_feedback',
    title: 'Goal Setting Feedback',
    showProgress: true,
    allowSkip: false,
    questions: [
      {
        id: 'goal_clarity',
        type: 'rating',
        title: 'How clear are your current goals?',
        category: 'goals',
        priority: 1,
      },
      {
        id: 'goal_obstacles',
        type: 'choice',
        title: 'Biggest obstacle to setting goals?',
        options: [
          'Not knowing where to start',
          'Goals feel too overwhelming',
          'Not sure if goals are realistic',
          'Hard to measure progress',
          'Other',
        ],
        category: 'goals',
        priority: 2,
      },
      {
        id: 'goal_suggestions',
        type: 'text',
        title: 'What would make goal setting easier?',
        placeholder: 'Share your ideas...',
        category: 'goals',
        priority: 3,
      },
    ],
  },

  // Task management feedback
  task_feedback: {
    id: 'task_feedback',
    title: 'Task Management Feedback',
    showProgress: true,
    allowSkip: true,
    questions: [
      {
        id: 'task_organization',
        type: 'rating',
        title: 'How well can you organize tasks?',
        category: 'tasks',
        priority: 1,
      },
      {
        id: 'task_prioritization',
        type: 'yesno',
        title: 'Do you find it easy to prioritize tasks?',
        category: 'tasks',
        priority: 2,
      },
      {
        id: 'task_features',
        type: 'priority',
        title: 'Rank these features by importance:',
        options: [
          'Quick add tasks',
          'Recurring tasks',
          'Task categories',
          'Due dates',
          'Reminders',
        ],
        category: 'tasks',
        priority: 3,
      },
    ],
  },

  // Critical UX issues survey
  ux_critical: {
    id: 'ux_critical',
    title: 'Help Us Fix UX Issues',
    description: 'We noticed some areas that need improvement. Please help us prioritize.',
    showProgress: true,
    allowSkip: true,
    questions: [
      {
        id: 'critical_navigation',
        type: 'rating',
        title: 'How easy is it to navigate the app?',
        category: 'navigation',
        priority: 1,
      },
      {
        id: 'critical_confusion',
        type: 'choice',
        title: 'What causes the most confusion?',
        options: [
          'Unclear buttons/icons',
          'Too many steps to complete tasks',
          'Inconsistent design',
          'Missing feedback on actions',
          'Slow performance',
        ],
        category: 'navigation',
        priority: 2,
      },
      {
        id: 'critical_frustration',
        type: 'scale',
        title: 'How frustrated are you with the current UX?',
        description: '1 = Not frustrated, 10 = Very frustrated',
        category: 'navigation',
        priority: 3,
      },
      {
        id: 'critical_must_fix',
        type: 'text',
        title: 'What ONE thing should we fix first?',
        placeholder: 'Describe the most annoying issue...',
        category: 'navigation',
        priority: 4,
      },
    ],
  },

  // Feature discovery
  feature_discovery: {
    id: 'feature_discovery',
    title: 'Feature Discovery',
    showProgress: true,
    allowSkip: true,
    questions: [
      {
        id: 'feature_awareness',
        type: 'choice',
        title: 'Which features did you not know existed?',
        options: [
          'Goal tracking',
          'Cognitive insights',
          'Smart notifications',
          'Progress analytics',
          'All of them',
        ],
        category: 'features',
        priority: 1,
      },
      {
        id: 'feature_usefulness',
        type: 'rating',
        title: 'Rate the usefulness of hidden features',
        category: 'features',
        priority: 2,
      },
    ],
  },
}

// ============================================================================
// Context & Provider
// ============================================================================

interface UxQuestionnaireContextType {
  isQuestionnaireOpen: boolean
  currentQuestionnaire: UxQuestionnaire | null
  currentQuestionIndex: number
  answers: UxAnswer[]
  openQuestionnaire: (questionnaire: UxQuestionnaire) => void
  closeQuestionnaire: () => void
  answerQuestion: (answer: UxAnswer) => void
  nextQuestion: () => void
  previousQuestion: () => void
  skipQuestionnaire: () => void
  completeQuestionnaire: () => void
  triggerQuickSurvey: (type: keyof typeof UX_QUESTIONNAIRES) => void
}

const UxQuestionnaireContext = createContext<UxQuestionnaireContextType | undefined>(undefined)

export function UxQuestionnaireProvider({ children }: { children: ReactNode }) {
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false)
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<UxQuestionnaire | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<UxAnswer[]>([])

  const openQuestionnaire = useCallback((questionnaire: UxQuestionnaire) => {
    // Sort questions by priority
    const sortedQuestions = [...questionnaire.questions].sort((a, b) => 
      (a.priority || 999) - (b.priority || 999)
    )
    
    setCurrentQuestionnaire({ ...questionnaire, questions: sortedQuestions })
    setCurrentQuestionIndex(0)
    setAnswers([])
    setIsQuestionnaireOpen(true)
  }, [])

  const closeQuestionnaire = useCallback(() => {
    setIsQuestionnaireOpen(false)
    setCurrentQuestionnaire(null)
    setCurrentQuestionIndex(0)
    setAnswers([])
  }, [])

  const answerQuestion = useCallback((answer: UxAnswer) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === answer.questionId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = answer
        return updated
      }
      return [...prev, answer]
    })
  }, [])

  const nextQuestion = useCallback(() => {
    if (!currentQuestionnaire) return
    
    if (currentQuestionIndex < currentQuestionnaire.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // Complete questionnaire
      currentQuestionnaire.onComplete?.(answers)
      closeQuestionnaire()
    }
  }, [currentQuestionnaire, currentQuestionIndex, answers, closeQuestionnaire])

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [currentQuestionIndex])

  const skipQuestionnaire = useCallback(() => {
    if (currentQuestionnaire?.onSkip) {
      currentQuestionnaire.onSkip()
    }
    closeQuestionnaire()
  }, [currentQuestionnaire, closeQuestionnaire])

  const completeQuestionnaire = useCallback(() => {
    if (currentQuestionnaire) {
      currentQuestionnaire.onComplete?.(answers)
    }
    closeQuestionnaire()
  }, [currentQuestionnaire, answers, closeQuestionnaire])

  const triggerQuickSurvey = useCallback((type: keyof typeof UX_QUESTIONNAIRES) => {
    const questionnaire = UX_QUESTIONNAIRES[type]
    if (questionnaire) {
      openQuestionnaire(questionnaire)
    }
  }, [openQuestionnaire])

  return (
    <UxQuestionnaireContext.Provider
      value={{
        isQuestionnaireOpen,
        currentQuestionnaire,
        currentQuestionIndex,
        answers,
        openQuestionnaire,
        closeQuestionnaire,
        answerQuestion,
        nextQuestion,
        previousQuestion,
        skipQuestionnaire,
        completeQuestionnaire,
        triggerQuickSurvey,
      }}
    >
      {children}
    </UxQuestionnaireContext.Provider>
  )
}

export function useUxQuestionnaire() {
  const context = useContext(UxQuestionnaireContext)
  if (!context) {
    throw new Error('useUxQuestionnaire must be used within UxQuestionnaireProvider')
  }
  return context
}