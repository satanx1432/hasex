'use client'

import React, { useState, useEffect } from 'react'
import { useUxQuestionnaire, UxAnswer, QuestionType } from './questionnaire-context'

// ============================================================================
// Individual Question Components
// ============================================================================

interface RatingQuestionProps {
  value: number
  onChange: (value: number) => void
  max?: number
}

function RatingQuestion({ value, onChange, max = 5 }: RatingQuestionProps) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
        <button
          key={rating}
          onClick={() => onChange(rating)}
          className={`w-12 h-12 rounded-lg border-2 text-lg font-semibold transition-all ${
            value >= rating
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'bg-white border-gray-200 text-gray-400 hover:border-primary-300'
          }`}
        >
          {rating}
        </button>
      ))}
    </div>
  )
}

interface YesNoQuestionProps {
  value: boolean | null
  onChange: (value: boolean) => void
}

function YesNoQuestion({ value, onChange }: YesNoQuestionProps) {
  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={() => onChange(true)}
        className={`px-8 py-4 rounded-lg font-semibold transition-all ${
          value === true
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-green-100'
        }`}
      >
        ✓ Yes
      </button>
      <button
        onClick={() => onChange(false)}
        className={`px-8 py-4 rounded-lg font-semibold transition-all ${
          value === false
            ? 'bg-red-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-red-100'
        }`}
      >
        ✗ No
      </button>
    </div>
  )
}

interface ChoiceQuestionProps {
  value: string | null
  onChange: (value: string) => void
  options: string[]
}

function ChoiceQuestion({ value, onChange, options }: ChoiceQuestionProps) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onChange(option)}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            value === option
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 bg-white hover:border-primary-300'
          }`}
        >
          <span className="flex items-center gap-3">
            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm ${
              value === option
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-300'
            }`}>
              {value === option && '✓'}
            </span>
            {option}
          </span>
        </button>
      ))}
    </div>
  )
}

interface ScaleQuestionProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

function ScaleQuestion({ value, onChange, min = 1, max = 10 }: ScaleQuestionProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-gray-500">
        <span>{min} = Very Easy</span>
        <span>{max} = Very Difficult</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
      />
      <div className="text-center text-3xl font-bold text-primary-600">
        {value}
      </div>
    </div>
  )
}

interface TextQuestionProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextQuestion({ value, onChange, placeholder }: TextQuestionProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full p-4 border-2 border-gray-200 rounded-lg resize-none focus:border-primary-500 focus:outline-none"
    />
  )
}

interface PriorityQuestionProps {
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
}

function PriorityQuestion({ value, onChange, options }: PriorityQuestionProps) {
  const [items, setItems] = useState(value.length > 0 ? value : options)
  
  useEffect(() => {
    onChange(items)
  }, [items])

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items]
    const [removed] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, removed)
    setItems(newItems)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4">Drag or click arrows to reorder (most important first)</p>
      {items.map((item, index) => (
        <div
          key={item}
          className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg"
        >
          <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
            {index + 1}
          </span>
          <span className="flex-1">{item}</span>
          <div className="flex gap-1">
            <button
              onClick={() => index > 0 && moveItem(index, index - 1)}
              disabled={index === 0}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => index < items.length - 1 && moveItem(index, index + 1)}
              disabled={index === items.length - 1}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Questionnaire Modal Component
// ============================================================================

export function UxQuestionnaireModal() {
  const {
    isQuestionnaireOpen,
    currentQuestionnaire,
    currentQuestionIndex,
    answers,
    closeQuestionnaire,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    skipQuestionnaire,
  } = useUxQuestionnaire()

  const [localValue, setLocalValue] = useState<any>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Reset local value when question changes
  useEffect(() => {
    const currentAnswer = answers.find(
      (a) => a.questionId === currentQuestionnaire?.questions[currentQuestionIndex]?.id
    )
    setLocalValue(currentAnswer?.value ?? null)
  }, [currentQuestionIndex, currentQuestionnaire, answers])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQuestionnaireOpen) {
        skipQuestionnaire()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isQuestionnaireOpen, skipQuestionnaire])

  if (!isQuestionnaireOpen || !currentQuestionnaire) return null

  const currentQuestion = currentQuestionnaire.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / currentQuestionnaire.questions.length) * 100
  const isLastQuestion = currentQuestionIndex === currentQuestionnaire.questions.length - 1
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion.id)
  const hasAnswer = localValue !== null && localValue !== ''

  const handleNext = () => {
    if (!hasAnswer && currentQuestion.required) return
    
    const answer: UxAnswer = {
      questionId: currentQuestion.id,
      value: localValue,
      timestamp: Date.now(),
    }
    answerQuestion(answer)
    
    setIsAnimating(true)
    setTimeout(() => {
      setIsAnimating(false)
      nextQuestion()
    }, 150)
  }

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'rating':
        return (
          <RatingQuestion
            value={typeof localValue === 'number' ? localValue : 0}
            onChange={setLocalValue}
          />
        )
      case 'yesno':
        return (
          <YesNoQuestion
            value={typeof localValue === 'boolean' ? localValue : null}
            onChange={setLocalValue}
          />
        )
      case 'choice':
        return (
          <ChoiceQuestion
            value={typeof localValue === 'string' ? localValue : null}
            onChange={setLocalValue}
            options={currentQuestion.options || []}
          />
        )
      case 'scale':
        return (
          <ScaleQuestion
            value={typeof localValue === 'number' ? localValue : 5}
            onChange={setLocalValue}
          />
        )
      case 'text':
        return (
          <TextQuestion
            value={typeof localValue === 'string' ? localValue : ''}
            onChange={setLocalValue}
            placeholder={currentQuestion.placeholder}
          />
        )
      case 'priority':
        return (
          <PriorityQuestion
            value={Array.isArray(localValue) ? localValue : []}
            onChange={setLocalValue}
            options={currentQuestion.options || []}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => currentQuestionnaire.allowSkip && skipQuestionnaire()}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all ${
        isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">{currentQuestionnaire.title}</h2>
            {currentQuestionnaire.allowSkip && (
              <button
                onClick={skipQuestionnaire}
                className="text-white/80 hover:text-white text-sm"
              >
                Skip
              </button>
            )}
          </div>
          {currentQuestionnaire.description && (
            <p className="text-white/80 text-sm">{currentQuestionnaire.description}</p>
          )}
        </div>

        {/* Progress Bar */}
        {currentQuestionnaire.showProgress && (
          <div className="h-1 bg-gray-100">
            <div 
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Question Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {currentQuestion.title}
            </h3>
            {currentQuestion.description && (
              <p className="text-gray-500 text-sm">{currentQuestion.description}</p>
            )}
          </div>

          <div className="min-h-[120px]">
            {renderQuestion()}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between">
          <button
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-30"
          >
            ← Back
          </button>
          
          <div className="flex gap-2">
            <span className="text-sm text-gray-400 self-center">
              {currentQuestionIndex + 1} / {currentQuestionnaire.questions.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasAnswer && currentQuestion.required}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                hasAnswer || !currentQuestion.required
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLastQuestion ? 'Complete' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Hook for triggering UX surveys at specific points
// ============================================================================

export function useUxSurvey() {
  const { triggerQuickSurvey, openQuestionnaire } = useUxQuestionnaire()

  // Call this after user completes a goal
  const surveyGoalCompletion = () => {
    triggerQuickSurvey('goal_feedback')
  }

  // Call this after user creates a task
  const surveyTaskCreation = () => {
    triggerQuickSurvey('task_feedback')
  }

  // Call this on first login
  const surveyOnboarding = () => {
    triggerQuickSurvey('onboarding_feedback')
  }

  // Call this when detecting frustration (e.g., multiple failed attempts)
  const surveyCriticalIssues = () => {
    triggerQuickSurvey('ux_critical')
  }

  // Call this when user hasn't used a feature
  const surveyFeatureDiscovery = () => {
    triggerQuickSurvey('feature_discovery')
  }

  // Custom survey
  const customSurvey = (questionnaire: any) => {
    openQuestionnaire(questionnaire)
  }

  return {
    surveyGoalCompletion,
    surveyTaskCreation,
    surveyOnboarding,
    surveyCriticalIssues,
    surveyFeatureDiscovery,
    customSurvey,
  }
}