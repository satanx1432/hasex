import { contentResearchService } from '../content/research-service'
import { NVIDIANIMService } from '../ai/nvidia-nim'

export interface TaskCompletionContext {
  user_id: string
  task_id: string
  task_title: string
  task_description: string
  learning_objectives: string[]
  previous_attempts: number
  mastery_level: 'beginner' | 'developing' | 'proficient' | 'advanced'
}

export interface QuizQuestion {
  id: string
  question_text: string
  options: string[]
  correct_answer: number
  explanation: string
  difficulty: number
  question_type: 'understanding' | 'application' | 'analysis' | 'recall'
}

export interface QuizAttempt {
  user_id: string
  task_id: string
  question_id: string
  selected_answer: number
  is_correct: boolean
  attempt_number: number
  time_taken_seconds: number
  completed_at: string
}

export interface TaskCompletionResult {
  task_id: string
  user_id: string
  completed: boolean
  quiz_score: number
  quiz_attempts: number
  mastery_level: string
  learning_insights: string[]
  next_steps: string[]
  should_continue: boolean
}

export class TaskCompletionWithQuiz {
  private nvidiaService: NVIDIANIMService
  private maxRetries = 2
  private passingScore = 0.6 // 60% to pass

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
  }

  async generateQuizForTask(context: TaskCompletionContext): Promise<QuizQuestion[]> {
    // First, research content related to the task
    const researchContent = await this.gatherLearningContent(context)

    // Generate quiz questions based on the content
    const questions = await this.generateQuizQuestions(researchContent, context)

    return questions.slice(0, 5) // Limit to 5 questions
  }

  private async gatherLearningContent(context: TaskCompletionContext): Promise<string> {
    let content = `Task: ${context.task_title}\n`
    content += `Description: ${context.task_description}\n`
    content += `Learning Objectives: ${context.learning_objectives.join(', ')}\n\n`

    // Try to research additional content
    try {
      const research = await contentResearchService.researchTopic(
        context.task_title,
        {
          scrapeContent: false,
          maxUrls: 2,
        }
      )

      if (research.keyPoints.length > 0) {
        content += `Key Points:\n${research.keyPoints.join('\n')}\n\n`
      }

      if (research.practicalApplications.length > 0) {
        content += `Practical Applications:\n${research.practicalApplications.join('\n')}\n\n`
      }
    } catch (error) {
      console.error('Failed to gather research content:', error)
    }

    return content
  }

  private async generateQuizQuestions(content: string, context: TaskCompletionContext): Promise<QuizQuestion[]> {
    const systemPrompt = `You are an educational assessment expert specializing in creating multiple-choice questions to test understanding and mastery. Generate 5 quiz questions based on the provided content.

Question types to include:
- Understanding: Test comprehension of concepts
- Application: Test ability to apply knowledge
- Analysis: Test ability to analyze and evaluate
- Recall: Test memory of key information

Each question should:
- Have 4 options (A, B, C, D)
- Include a clear explanation of the correct answer
- Be appropriate for the user's mastery level (${context.mastery_level})
- Vary in difficulty based on question type

Return a JSON response with this structure:
{
  "questions": [
    {
      "question_text": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explanation of why this is correct",
      "difficulty": 1-10,
      "question_type": "understanding|application|analysis|recall"
    }
  ]
}`

    const userPrompt = `Content to base questions on:\n${content}\n\nGenerate 5 multiple-choice questions to test understanding of this task and its learning objectives.`

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
        id: `quiz_${context.task_id}_${index}`,
      }))
    } catch (error) {
      console.error('Failed to generate quiz questions:', error)
      return this.getFallbackQuizQuestions(context)
    }
  }

  private getFallbackQuizQuestions(context: TaskCompletionContext): QuizQuestion[] {
    return [
      {
        id: `fallback_${context.task_id}_0`,
        question_text: `What is the main purpose of "${context.task_title}"?`,
        options: [
          'To build momentum toward the goal',
          'To complete the entire goal at once',
          'To test your commitment',
          'To measure your time management',
        ],
        correct_answer: 0,
        explanation: 'The main purpose of individual tasks is to build sustainable momentum toward your larger goal.',
        difficulty: 3,
        question_type: 'understanding',
      },
      {
        id: `fallback_${context.task_id}_1`,
        question_text: `Which of the following best describes the If-Then planning approach?`,
        options: [
          'Planning what to do if conditions change',
          'Creating conditional action plans',
          'Setting alternative goals',
          'Planning for failure scenarios',
        ],
        correct_answer: 1,
        explanation: 'If-Then planning creates specific action plans triggered by contextual cues, making action more automatic.',
        difficulty: 5,
        question_type: 'understanding',
      },
      {
        id: `fallback_${context.task_id}_2`,
        question_text: `How does completing small tasks contribute to long-term success?`,
        options: [
          'It guarantees immediate results',
          'It builds habits and momentum',
          'It eliminates the need for planning',
          'It reduces the importance of the goal',
        ],
        correct_answer: 1,
        explanation: 'Small completed tasks build behavioral habits and create momentum that sustains long-term effort.',
        difficulty: 4,
        question_type: 'application',
      },
      {
        id: `fallback_${context.task_id}_3`,
        question_text: `What is the most important factor in task completion?`,
        options: [
          'Task difficulty',
          'Task duration',
          'Consistency and follow-through',
          'External rewards',
        ],
        correct_answer: 2,
        explanation: 'Consistency and follow-through are more important than individual task characteristics for long-term success.',
        difficulty: 6,
        question_type: 'analysis',
      },
      {
        id: `fallback_${context.task_id}_4`,
        question_text: `When should you adjust your task approach?`,
        options: [
          'Never, stick to the original plan',
          'Only after completing all tasks',
          'When you consistently miss tasks',
          'When you feel bored',
        ],
        correct_answer: 2,
        explanation: 'Consistent task missed patterns indicate the need for approach adjustment while maintaining goal commitment.',
        difficulty: 5,
        question_type: 'application',
      },
    ]
  }

  async submitQuizAttempt(
    attempt: QuizAttempt
  ): Promise<{ is_correct: boolean; feedback: string; should_continue: boolean }> {
    // Record the attempt (in production, this would save to database)
    console.log('Recording quiz attempt:', attempt)

    // Generate feedback based on the answer
    const feedback = await this.generateFeedback(attempt)

    // Determine if user should continue based on performance
    const shouldContinue = this.shouldContinueWithQuiz(attempt)

    return {
      is_correct: attempt.is_correct,
      feedback,
      should_continue: shouldContinue,
    }
  }

  private async generateFeedback(attempt: QuizAttempt): Promise<string> {
    if (attempt.is_correct) {
      return 'Correct! Well done. You demonstrate good understanding of this concept.'
    } else {
      return 'Not quite right. Review the explanation and try to understand the underlying concept before your next attempt.'
    }
  }

  private shouldContinueWithQuiz(attempt: QuizAttempt): boolean {
    // Allow up to maxRetries
    return attempt.attempt_number <= this.maxRetries
  }

  async calculateQuizResults(
    attempts: QuizAttempt[],
    totalQuestions: number
  ): Promise<{
    score: number
    passed: boolean
    mastery_level: string
    insights: string[]
  }> {
    const correctCount = attempts.filter(a => a.is_correct).length
    const score = correctCount / totalQuestions
    const passed = score >= this.passingScore

    // Determine mastery level based on score
    let mastery_level = 'beginner'
    if (score >= 0.9) mastery_level = 'advanced'
    else if (score >= 0.7) mastery_level = 'proficient'
    else if (score >= 0.5) mastery_level = 'developing'

    // Generate insights
    const insights = this.generatePerformanceInsights(attempts, score)

    return {
      score,
      passed,
      mastery_level,
      insights,
    }
  }

  private generatePerformanceInsights(attempts: QuizAttempt[], score: number): string[] {
    const insights: string[] = []

    if (score >= 0.9) {
      insights.push('Excellent understanding of the material')
      insights.push('Ready for more advanced challenges')
    } else if (score >= 0.7) {
      insights.push('Good grasp of core concepts')
      insights.push('Some areas could be strengthened with practice')
    } else if (score >= this.passingScore) {
      insights.push('Adequate understanding achieved')
      insights.push('Reviewing explanations will help solidify knowledge')
    } else {
      insights.push('Consider reviewing the learning content again')
      insights.push('Focus on understanding the why behind the answers')
    }

    // Check for patterns in wrong answers
    const wrongAnswers = attempts.filter(a => !a.is_correct)
    if (wrongAnswers.length > 2) {
      insights.push('Multiple incorrect answers suggest need for content review')
    }

    return insights
  }

  async completeTaskWithQuiz(
    context: TaskCompletionContext,
    quizAttempts: QuizAttempt[]
  ): Promise<TaskCompletionResult> {
    const totalQuestions = 5 // Assuming 5 questions per quiz
    const results = await this.calculateQuizResults(quizAttempts, totalQuestions)

    // Determine if task should be considered complete
    const completed = results.passed || quizAttempts.length > this.maxRetries

    // Generate next steps based on performance
    const nextSteps = await this.generateNextSteps(context, results)

    return {
      task_id: context.task_id,
      user_id: context.user_id,
      completed,
      quiz_score: results.score,
      quiz_attempts: quizAttempts.length,
      mastery_level: results.mastery_level,
      learning_insights: results.insights,
      next_steps: nextSteps,
      should_continue: completed,
    }
  }

  private async generateNextSteps(
    context: TaskCompletionContext,
    results: any
  ): Promise<string[]> {
    const nextSteps: string[] = []

    if (results.passed) {
      nextSteps.push('Proceed to the next task in your roadmap')
      nextSteps.push('Apply what you learned in real-world situations')
    } else if (results.score >= 0.4) {
      nextSteps.push('Review the learning content again')
      nextSteps.push('Try the quiz one more time')
    } else {
      nextSteps.push('Consider revisiting earlier tasks to build foundation')
      nextSteps.push('Reach out for support if concepts remain unclear')
    }

    // Add personalized next steps based on mastery level
    switch (results.mastery_level) {
      case 'advanced':
        nextSteps.push('Ready for more challenging tasks')
        break
      case 'proficient':
        nextSteps.push('Continue building on current understanding')
        break
      case 'developing':
        nextSteps.push('Practice will help solidify understanding')
        break
      case 'beginner':
        nextSteps.push('Focus on grasping fundamental concepts')
        break
    }

    return nextSteps
  }

  async adaptQuizDifficulty(
    previousPerformance: {
      average_score: number
      mastery_level: string
    },
    currentMasteryLevel: string
  ): Promise<{ should_adjust: boolean; new_difficulty: number }> {
    // If user is performing well, increase difficulty
    if (previousPerformance.average_score >= 0.85 && currentMasteryLevel === 'advanced') {
      return {
        should_adjust: true,
        new_difficulty: 8, // Increase difficulty
      }
    }

    // If user is struggling, decrease difficulty
    if (previousPerformance.average_score < 0.5 && currentMasteryLevel === 'beginner') {
      return {
        should_adjust: true,
        new_difficulty: 3, // Decrease difficulty
      }
    }

    return {
      should_adjust: false,
      new_difficulty: 5, // Maintain medium difficulty
    }
  }
}

export const taskCompletionWithQuiz = new TaskCompletionWithQuiz()