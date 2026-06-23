interface Path {
  id: string
  title: string
  description: string
  order: number
  estimatedDuration: string
  isStarter: boolean
}

interface PathGenerationResult {
  starterPaths: Path[]
  fullPathSequence: Path[]
  reasoning: string
}

class PathGenerator {
  async generateStarterPaths(
    destination: string,
    goal: string,
    userSkill?: string
  ): Promise<PathGenerationResult> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a strategic planning expert. Your job is to generate ONLY TWO starter paths for the user's destination.

The user has a destination: "${destination}"
Original goal: "${goal}"${userSkill ? `\nUser skill level: ${userSkill}` : ''}

Generate exactly TWO distinct starting points that represent different approaches to achieving the destination. Each starter path should:
- Be a clear, actionable first phase
- Represent a different strategic approach
- Be realistic and achievable
- Have a clear purpose

Example for "Build a profitable startup":
Path A: "Validate Problems" - Talk to potential users to understand real problems
Path B: "Build MVP" - Create a minimal product to test assumptions

Return JSON format:
{
  "starterPaths": [
    {
      "id": "path_a",
      "title": "First Path Title",
      "description": "Brief description of what this path involves",
      "order": 1,
      "estimatedDuration": "X weeks",
      "isStarter": true
    },
    {
      "id": "path_b",
      "title": "Second Path Title",
      "description": "Brief description of what this path involves",
      "order": 2,
      "estimatedDuration": "X weeks",
      "isStarter": true
    }
  ],
  "fullPathSequence": [
    // Include the full sequence as a preview of what comes after
  ],
  "reasoning": "Explain why these two paths were chosen"
}`

      const userPrompt = `Generate two starter paths for: ${destination}`

      const response = await nvidiaNIMService.makeRequest('nvidia/llama-3.1-nemotron-70b-instruct', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate paths:', error)
    }

    // Fallback paths
    return {
      starterPaths: [
        {
          id: 'path_a',
          title: 'Research & Planning',
          description: 'Study the requirements and create a detailed plan',
          order: 1,
          estimatedDuration: '2 weeks',
          isStarter: true
        },
        {
          id: 'path_b',
          title: 'Direct Action',
          description: 'Start with immediate practical implementation',
          order: 2,
          estimatedDuration: '2 weeks',
          isStarter: true
        }
      ],
      fullPathSequence: [],
      reasoning: 'Fallback paths - AI generation unavailable'
    }
  }

  async generateFullSequence(
    selectedPath: Path,
    destination: string,
    complexity: string
  ): Promise<Path[]> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a strategic planning expert. Generate the complete sequence of paths/stages for achieving the destination.

Starting point: "${selectedPath.title}"
Destination: "${destination}"
Complexity: ${complexity}

Generate a logical sequence of 4-8 paths that progress from the starting point to the destination. Each path should:
- Build naturally on the previous one
- Have a clear purpose and deliverable
- Be achievable with the skills from previous paths
- Move the user closer to the destination

Return JSON format:
[
  {
    "id": "path_1",
    "title": "Path Title",
    "description": "Description",
    "order": 1,
    "estimatedDuration": "X weeks",
    "isStarter": false
  },
  ...
]`

      const userPrompt = `Generate the full path sequence starting from "${selectedPath.title}" to achieve "${destination}"`

      const response = await nvidiaNIMService.makeRequest('nvidia/llama-3.1-nemotron-70b-instruct', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate full sequence:', error)
    }

    // Fallback sequence
    return [
      selectedPath,
      {
        id: 'path_2',
        title: 'Skill Development',
        description: 'Develop necessary skills for the next phase',
        order: 2,
        estimatedDuration: '4 weeks',
        isStarter: false
      },
      {
        id: 'path_3',
        title: 'Implementation',
        description: 'Apply skills to create deliverables',
        order: 3,
        estimatedDuration: '6 weeks',
        isStarter: false
      },
      {
        id: 'path_4',
        title: 'Refinement',
        description: 'Improve and polish the work',
        order: 4,
        estimatedDuration: '4 weeks',
        isStarter: false
      }
    ]
  }
}

export const pathGenerator = new PathGenerator()
