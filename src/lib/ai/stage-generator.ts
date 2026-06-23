interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

interface Quiz {
  id: string
  title: string
  questions: QuizQuestion[]
  passingScore: number
}

interface Stage {
  id: string
  pathId: string
  title: string
  description: string
  skills: string[]
  duration: number // days
  restDays: number
  dailyMissions: string[]
  quiz: Quiz
  successCriteria: string[]
  order: number
}

interface StageGenerationResult {
  stages: Stage[]
  reasoning: string
}

class StageGenerator {
  async generateStages(
    path: any,
    destination: string,
    goalType: 'short_term' | 'medium_term' | 'long_term'
  ): Promise<StageGenerationResult> {
    // Determine base duration based on goal type
    let baseDuration = 30
    let restDays = 5

    if (goalType === 'short_term') {
      baseDuration = 14
      restDays = 2
    } else if (goalType === 'long_term') {
      baseDuration = 70
      restDays = 7
    }

    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a curriculum design expert. Your job is to break down the selected path into detailed learning stages.

Path: "${path.title}"
Destination: "${destination}"
Goal type: ${goalType}
Base duration: ${baseDuration} days + ${restDays} rest days

Generate 3-6 stages that progress from the path to the destination. Each stage should:
- Build naturally on previous stages
- Have clear, specific learning objectives
- Include necessary skills to develop
- Have achievable success criteria
- Include a placement quiz to assess prior knowledge

For each stage, generate:
- title: Clear, descriptive stage name
- description: What the stage focuses on
- skills: Array of 3-5 skills learned in this stage
- duration: Days (adjust based on complexity, total should align with ${baseDuration} days base)
- restDays: Break days between stages
- dailyMissions: 3-5 example daily missions
- quiz: A 5-question placement quiz with multiple choice answers
- successCriteria: 3-5 measurable outcomes
- order: Sequential order

Quiz format:
- 5 multiple choice questions
- Each question has 4 options (index 0-3)
- Specify correct answer index
- Include explanation for why it's correct

Return JSON format:
{
  "stages": [
    {
      "id": "stage_1",
      "pathId": "${path.id}",
      "title": "Stage Title",
      "description": "Description",
      "skills": ["skill1", "skill2", ...],
      "duration": number,
      "restDays": number,
      "dailyMissions": ["mission1", "mission2", ...],
      "quiz": {
        "id": "quiz_1",
        "title": "Stage 1 Assessment",
        "questions": [
          {
            "id": "q1",
            "question": "Question text",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": 0,
            "explanation": "Why this is correct"
          },
          ...
        ],
        "passingScore": 80
      },
      "successCriteria": ["criteria1", "criteria2", ...],
      "order": 1
    },
    ...
  ],
  "reasoning": "Explain the stage breakdown and duration allocation"
}`

      const userPrompt = `Generate stages for path: ${path.title} leading to: ${destination}`

      const response = await nvidiaNIMService.makeRequest('nvidia/llama-3.1-nemotron-70b-instruct', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate stages:', error)
    }

    // Fallback stages
    return {
      stages: [
        {
          id: 'stage_1',
          pathId: path.id,
          title: 'Foundation',
          description: 'Build the fundamental knowledge and skills',
          skills: ['Basic concepts', 'Core terminology', 'Essential tools'],
          duration: Math.floor(baseDuration * 0.3),
          restDays: restDays,
          dailyMissions: ['Study core concepts', 'Practice fundamentals', 'Review notes'],
          quiz: {
            id: 'quiz_1',
            title: 'Foundation Assessment',
            questions: [
              {
                id: 'q1',
                question: 'What is the primary goal of this stage?',
                options: ['Build foundation', 'Create product', 'Launch business', 'Scale operations'],
                correctAnswer: 0,
                explanation: 'This stage focuses on building fundamental knowledge'
              },
              {
                id: 'q2',
                question: 'Which skill is most important?',
                options: ['Advanced tactics', 'Basic concepts', 'Marketing', 'Sales'],
                correctAnswer: 1,
                explanation: 'Basic concepts are foundational'
              }
            ],
            passingScore: 80
          },
          successCriteria: ['Understand core concepts', 'Complete practice exercises', 'Pass assessment'],
          order: 1
        },
        {
          id: 'stage_2',
          pathId: path.id,
          title: 'Application',
          description: 'Apply knowledge to practical scenarios',
          skills: ['Practical application', 'Problem solving', 'Implementation'],
          duration: Math.floor(baseDuration * 0.4),
          restDays: restDays,
          dailyMissions: ['Apply concepts', 'Solve problems', 'Build small projects'],
          quiz: {
            id: 'quiz_2',
            title: 'Application Assessment',
            questions: [
              {
                id: 'q1',
                question: 'What is the focus of application?',
                options: ['Theory only', 'Practice', 'Planning', 'Research'],
                correctAnswer: 1,
                explanation: 'Application focuses on practical implementation'
              }
            ],
            passingScore: 80
          },
          successCriteria: ['Complete practical projects', 'Solve real problems', 'Demonstrate skills'],
          order: 2
        },
        {
          id: 'stage_3',
          pathId: path.id,
          title: 'Mastery',
          description: 'Achieve proficiency and independence',
          skills: ['Advanced techniques', 'Optimization', 'Mentorship'],
          duration: Math.floor(baseDuration * 0.3),
          restDays: 0,
          dailyMissions: ['Optimize work', 'Teach others', 'Create advanced projects'],
          quiz: {
            id: 'quiz_3',
            title: 'Mastery Assessment',
            questions: [
              {
                id: 'q1',
                question: 'What defines mastery?',
                options: ['Basic knowledge', 'Practice', 'Proficiency and independence', 'Teaching'],
                correctAnswer: 2,
                explanation: 'Mastery is achieving proficiency and independence'
              }
            ],
            passingScore: 80
          },
          successCriteria: ['Work independently', 'Optimize processes', 'Help others learn'],
          order: 3
        }
      ],
      reasoning: 'Fallback stages - AI generation unavailable'
    }
  }

  calculateQuizScore(answers: number[], quiz: Quiz): number {
    let correct = 0
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correct++
      }
    })
    return Math.round((correct / quiz.questions.length) * 100)
  }

  adjustStageDuration(stage: Stage, quizScore: number): Stage {
    if (quizScore >= 80) {
      // Skip stage entirely - set to minimal duration
      return { ...stage, duration: 1 }
    } else if (quizScore >= 40) {
      // Reduce duration by 50%
      return { ...stage, duration: Math.max(3, Math.floor(stage.duration * 0.5)) }
    }
    // Keep full duration for scores below 40%
    return stage
  }
}

export const stageGenerator = new StageGenerator()
