'use client'

/**
 * Example component showing how to use the UX Questionnaire System
 * 
 * This component demonstrates different ways to trigger surveys
 * at key moments in the user journey.
 */

import { useUxQuestionnaire, UX_QUESTIONNAIRES } from './questionnaire-context'
import { useUxSurvey } from './questionnaire-modal'

export function UxSurveyExamples() {
  const { triggerQuickSurvey, openQuestionnaire } = useUxQuestionnaire()
  const { 
    surveyOnboarding, 
    surveyGoalCompletion, 
    surveyCriticalIssues,
    surveyFeatureDiscovery 
  } = useUxSurvey()

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">UX Survey Examples</h2>
      
      {/* Pre-built Surveys */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pre-built Surveys</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={surveyOnboarding}
            className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            🎯 Onboarding Feedback
          </button>
          
          <button
            onClick={surveyGoalCompletion}
            className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            🎯 Goal Feedback
          </button>
          
          <button
            onClick={() => triggerQuickSurvey('task_feedback')}
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            📋 Task Feedback
          </button>
          
          <button
            onClick={surveyCriticalIssues}
            className="p-4 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            ⚠️ Critical UX Issues
          </button>
          
          <button
            onClick={surveyFeatureDiscovery}
            className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            🔍 Feature Discovery
          </button>
        </div>
      </div>

      {/* Custom Survey */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Custom Survey</h3>
        
        <button
          onClick={() => {
            openQuestionnaire({
              id: 'custom_feedback',
              title: 'Quick Feedback',
              description: 'Help us improve!',
              showProgress: true,
              allowSkip: true,
              questions: [
                {
                  id: 'rate_experience',
                  type: 'rating',
                  title: 'How would you rate your experience?',
                  required: true,
                },
                {
                  id: 'would_recommend',
                  type: 'yesno',
                  title: 'Would you recommend us?',
                  required: true,
                },
                {
                  id: 'improvement',
                  type: 'choice',
                  title: 'What should we improve?',
                  options: [
                    'Speed',
                    'Design',
                    'Features',
                    'Support',
                  ],
                },
                {
                  id: 'comments',
                  type: 'text',
                  title: 'Any other comments?',
                  placeholder: 'Share your thoughts...',
                },
              ],
              onComplete: (answers) => {
                console.log('Survey completed!', answers)
                // Send to analytics service
                // window.gtag?.('event', 'survey_complete', { survey_id: 'custom_feedback' })
              },
              onSkip: () => {
                console.log('Survey skipped')
              },
            })
          }}
          className="w-full p-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
        >
          📝 Open Custom Survey
        </button>
      </div>

      {/* Priority Survey Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Priority Ranking Survey</h3>
        
        <button
          onClick={() => {
            openQuestionnaire({
              id: 'feature_priority',
              title: 'Feature Priority',
              description: 'Help us decide what to build next',
              showProgress: true,
              allowSkip: true,
              questions: [
                {
                  id: 'priority_features',
                  type: 'priority',
                  title: 'Rank features by importance to you:',
                  options: [
                    'Dark mode',
                    'Mobile app',
                    'Team collaboration',
                    'Export data',
                    'API access',
                  ],
                },
                {
                  id: 'missing_feature',
                  type: 'text',
                  title: 'What feature are we missing?',
                  placeholder: 'Tell us what you need...',
                },
              ],
              onComplete: (answers) => {
                console.log('Priority survey:', answers)
              },
            })
          }}
          className="w-full p-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          🏆 Feature Priority Survey
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Integration Examples - Where to trigger surveys
// ============================================================================

/*
// 1. AFTER ONBOARDING (in onboarding complete handler)
const handleOnboardingComplete = async () => {
  await completeOnboarding()
  // Show survey after user completes onboarding
  setTimeout(() => {
    surveyOnboarding()
  }, 2000) // Wait 2 seconds for UI to settle
}

// 2. AFTER GOAL COMPLETION (in goal completion handler)
const handleGoalComplete = async (goalId: string) => {
  await markGoalComplete(goalId)
  // Show survey after completing a goal
  setTimeout(() => {
    surveyGoalCompletion()
  }, 1500)
}

// 3. AFTER MULTIPLE FAILED ATTEMPTS (in error handler)
const handleActionError = (error: Error, context: string) => {
  errorCount++
  
  // Show critical issues survey after 3 failed attempts
  if (errorCount >= 3) {
    surveyCriticalIssues()
    errorCount = 0 // Reset after showing survey
  }
}

// 4. ON FEATURE NEGLECT (in useEffect)
useEffect(() => {
  // Check if user hasn't used a feature in 7 days
  if (lastUsedFeature === null && daysSinceSignup >= 7) {
    surveyFeatureDiscovery()
  }
}, [lastUsedFeature, daysSinceSignup])

// 5. BEFORE USER LEAVES (in beforeunload or route change)
useEffect(() => {
  const handleLeave = () => {
    // Only show if user has been active
    if (sessionDuration > 60000) { // 1 minute
      triggerQuickSurvey('exit_feedback')
    }
  }
  
  router.events.on('routeChangeStart', handleLeave)
  return () => router.events.off('routeChangeStart', handleLeave)
}, [])
*/