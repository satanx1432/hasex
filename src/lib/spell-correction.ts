/**
 * Spell Correction and Goal Normalization Service
 * 
 * Handles typo detection, correction, and goal canonicalization
 */

interface SpellCorrectionResult {
  original: string
  corrected: string
  corrections: Array<{
    original: string
    corrected: string
    type: 'typo' | 'capitalization' | 'spacing' | 'ai_suggested'
  }>
  confidence: number
}

interface IntentSuggestion {
  text: string
  description: string
}

class SpellCorrectionEngine {
  // Common typo dictionary
  private readonly COMMON_TYPOS: Record<string, string> = {
    'pyhton': 'python',
    'pythonm': 'python',
    'pytho': 'python',
    'javasript': 'javascript',
    'javscript': 'javascript',
    'reactjs': 'react',
    'tyescript': 'typescript',
    'typescripy': 'typescript',
    'machien': 'machine',
    'machin': 'machine',
    'learnn': 'learn',
    'lern': 'learn',
    'larning': 'learning',
    'stuyd': 'study',
    'studing': 'studying',
    'progarm': 'program',
    'progarmming': 'programming',
    'programing': 'programming',
    'develp': 'develop',
    'develpment': 'development',
    'devlop': 'develop',
    'devloping': 'developing',
    'datascience': 'data science',
    'datascientist': 'data scientist',
    'machielearning': 'machine learning',
    'artifical': 'artificial',
    'inteligence': 'intelligence',
    'webdev': 'web development',
    'webdevlopment': 'web development',
    'fullstack': 'full stack',
    'fronttend': 'frontend',
    'backtend': 'backend',
    'uidesign': 'ui design',
    'uxdesign': 'ux design',
    'appdev': 'app development',
    'mobiledev': 'mobile development',
    'gamedev': 'game development',
    'blockchain': 'block chain',
    'crytocurrency': 'cryptocurrency',
    'cybersecuirty': 'cybersecurity',
    'cloudcomputing': 'cloud computing',
    'devops': 'devops',
    'agile': 'agile',
    'scrum': 'scrum',
    'productmanager': 'product manager',
    'projectmanager': 'project manager',
    'entreprenur': 'entrepreneur',
    'entreprenuership': 'entrepreneurship',
    'busness': 'business',
    'startup': 'startup',
    'invseting': 'investing',
    'trading': 'trading',
    'forex': 'forex',
    'crypto': 'crypto',
    'fitnes': 'fitness',
    'wieght': 'weight',
    'wieghtloss': 'weight loss',
    ' excerise': 'exercise',
    'workout': 'workout',
    'meditation': 'meditation',
    'mindfulness': 'mindfulness',
    'yoga': 'yoga',
    'nutrition': 'nutrition',
    'diet': 'diet',
    'healthylifestyle': 'healthy lifestyle',
    'selfimprovement': 'self improvement',
    'personalgrowth': 'personal growth',
    'careergrowth': 'career growth',
    'jobinterview': 'job interview',
    'resume': 'resume',
    'networking': 'networking',
    'publicspeaking': 'public speaking',
    'leadership': 'leadership',
    'management': 'management',
    'communication': 'communication',
    'timemanagement': 'time management',
    'procrastination': 'procrastination',
    'motivation': 'motivation',
    'productivity': 'productivity',
    'focus': 'focus',
    'discipline': 'discipline',
    'habit': 'habit',
    'routine': 'routine',
    'goalsetting': 'goal setting',
    'planning': 'planning',
    'organization': 'organization',
    'creativity': 'creativity',
    'innovation': 'innovation',
    'problemsolving': 'problem solving',
    'criticalthinking': 'critical thinking',
    'analytics': 'analytics',
    'marketing': 'marketing',
    'sales': 'sales',
    'digitalmarketing': 'digital marketing',
    'socialmedia': 'social media',
    'contentcreation': 'content creation',
    'copywriting': 'copywriting',
    'branding': 'branding',
    'photography': 'photography',
    'videography': 'videography',
    'music': 'music',
    'writing': 'writing',
    'blogging': 'blogging',
    'podcasting': 'podcasting',
    'language': 'language',
    'spanish': 'spanish',
    'french': 'french',
    'german': 'german',
    'japanese': 'japanese',
    'chinese': 'chinese',
    'english': 'english',
  }

  /**
   * Correct spelling and normalize text
   */
  async correctSpelling(text: string): Promise<SpellCorrectionResult> {
    const original = text.trim()
    if (!original) {
      return {
        original,
        corrected: '',
        corrections: [],
        confidence: 100
      }
    }

    let corrected = original
    const corrections: SpellCorrectionResult['corrections'] = []
    let totalConfidence = 100

    // Step 1: Apply common typo corrections
    const typoResult = this.correctCommonTypos(corrected)
    corrected = typoResult.corrected
    corrections.push(...typoResult.corrections)
    totalConfidence = Math.min(totalConfidence, typoResult.confidence)

    // Step 2: Fix capitalization
    const capitalizationResult = this.fixCapitalization(corrected)
    corrected = capitalizationResult.corrected
    corrections.push(...capitalizationResult.corrections)

    // Step 3: Fix spacing
    const spacingResult = this.fixSpacing(corrected)
    corrected = spacingResult.corrected
    corrections.push(...spacingResult.corrections)

    // Step 4: AI-powered correction for remaining issues
    if (corrected !== original) {
      const aiResult = await this.correctWithAI(corrected)
      if (aiResult.corrected !== corrected) {
        corrected = aiResult.corrected
        corrections.push(...aiResult.corrections)
        totalConfidence = Math.min(totalConfidence, aiResult.confidence)
      }
    }

    return {
      original,
      corrected,
      corrections,
      confidence: totalConfidence
    }
  }

  /**
   * Correct common typos using dictionary
   */
  private correctCommonTypos(text: string): { corrected: string; corrections: SpellCorrectionResult['corrections']; confidence: number } {
    let corrected = text.toLowerCase()
    const corrections: SpellCorrectionResult['corrections'] = []
    const words = corrected.split(/\s+/)
    let confidence = 100

    words.forEach((word, index) => {
      if (this.COMMON_TYPOS[word]) {
        corrections.push({
          original: word,
          corrected: this.COMMON_TYPOS[word],
          type: 'typo'
        })
        words[index] = this.COMMON_TYPOS[word]
        confidence -= 10 // Reduce confidence for typos
      }
    })

    return {
      corrected: words.join(' '),
      corrections,
      confidence: Math.max(50, confidence)
    }
  }

  /**
   * Fix capitalization (sentence case and proper nouns)
   */
  private fixCapitalization(text: string): { corrected: string; corrections: SpellCorrectionResult['corrections'] } {
    const corrections: SpellCorrectionResult['corrections'] = []
    
    // Capitalize first letter of sentence
    let corrected = text.charAt(0).toUpperCase() + text.slice(1)
    
    if (corrected !== text) {
      corrections.push({
        original: text,
        corrected,
        type: 'capitalization'
      })
    }

    return { corrected, corrections }
  }

  /**
   * Fix spacing issues
   */
  private fixSpacing(text: string): { corrected: string; corrections: SpellCorrectionResult['corrections'] } {
    const corrections: SpellCorrectionResult['corrections'] = []
    let corrected = text

    // Remove multiple spaces
    if (/\s{2,}/.test(corrected)) {
      const original = corrected
      corrected = corrected.replace(/\s{2,}/g, ' ')
      corrections.push({
        original,
        corrected,
        type: 'spacing'
      })
    }

    // Remove leading/trailing spaces
    corrected = corrected.trim()

    return { corrected, corrections }
  }

  /**
   * AI-powered spell correction for complex cases
   */
  private async correctWithAI(text: string): Promise<{ corrected: string; corrections: SpellCorrectionResult['corrections']; confidence: number }> {
    try {
      const NVIDIA_NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1'
      const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY

      if (!NVIDIA_NIM_API_KEY) {
        return { corrected: text, corrections: [], confidence: 100 }
      }

      const systemPrompt = `You are a spell correction and text normalization expert.
      
Your task is to correct spelling errors and normalize the text to canonical form.
Focus on:
1. Correcting spelling mistakes
2. Using proper terminology
3. Maintaining the original meaning
4. Making the text professional and clear

Return ONLY a JSON object with this exact format:
{
  "corrected": "corrected text",
  "confidence": number (0-100),
  "corrections": ["explanation of major corrections if any"]
}

If the text is already correct, return it unchanged with high confidence.`

      const response = await fetch(`${NVIDIA_NIM_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.2-1b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 128,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        return { corrected: text, corrections: [], confidence: 100 }
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)

      const corrections: SpellCorrectionResult['corrections'] = []
      if (result.corrected !== text && result.corrections) {
        corrections.push({
          original: text,
          corrected: result.corrected,
          type: 'ai_suggested'
        })
      }

      return {
        corrected: result.corrected || text,
        corrections,
        confidence: result.confidence || 80
      }
    } catch (error) {
      console.error('AI spell correction failed:', error)
      return { corrected: text, corrections: [], confidence: 100 }
    }
  }

  /**
   * Generate intent suggestions when confidence is low
   */
  async generateIntentSuggestions(originalText: string, correctedText: string): Promise<IntentSuggestion[]> {
    const suggestions: IntentSuggestion[] = []
    
    // Add the corrected version as primary suggestion
    if (correctedText !== originalText) {
      suggestions.push({
        text: correctedText,
        description: 'Spelling corrected'
      })
    }

    // Generate contextual suggestions based on the text
    const lowerText = correctedText.toLowerCase()
    
    if (lowerText.includes('python')) {
      suggestions.push(
        { text: 'Python programming', description: 'Learn Python coding' },
        { text: 'Python + Machine Learning', description: 'Combine Python with ML' },
        { text: 'Python for Data Science', description: 'Data analysis with Python' }
      )
    } else if (lowerText.includes('machine learning') || lowerText.includes('ml')) {
      suggestions.push(
        { text: 'Machine Learning Engineering', description: 'Build ML systems' },
        { text: 'Data Science with ML', description: 'Data analysis focus' },
        { text: 'Deep Learning', description: 'Neural networks and AI' }
      )
    } else if (lowerText.includes('web') || lowerText.includes('website')) {
      suggestions.push(
        { text: 'Web Development', description: 'Build websites' },
        { text: 'Full Stack Development', description: 'Frontend + Backend' },
        { text: 'Frontend Development', description: 'User interfaces' }
      )
    } else if (lowerText.includes('fitness') || lowerText.includes('weight') || lowerText.includes('exercise')) {
      suggestions.push(
        { text: 'Weight Loss', description: 'Lose weight healthily' },
        { text: 'Build Muscle', description: 'Strength training' },
        { text: 'General Fitness', description: 'Overall health' }
      )
    } else if (lowerText.includes('business') || lowerText.includes('startup')) {
      suggestions.push(
        { text: 'Start a Business', description: 'Launch a company' },
        { text: 'Business Development', description: 'Grow an existing business' },
        { text: 'Entrepreneurship', description: 'Build ventures' }
      )
    }

    // Add "Something else" option
    suggestions.push({
      text: 'Something else',
      description: 'Enter your own goal'
    })

    return suggestions.slice(0, 4) // Limit to 4 suggestions
  }

  /**
   * Normalize goal to canonical form for storage
   */
  normalizeGoalForStorage(goal: string): string {
    // Apply basic normalization
    let normalized = goal.trim()
    
    // Capitalize first letter
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1)
    
    // Remove extra spaces
    normalized = normalized.replace(/\s{2,}/g, ' ')
    
    // Ensure it starts with a verb if it doesn't already
    const verbs = ['learn', 'build', 'create', 'develop', 'master', 'improve', 'start', 'launch', 'grow', 'achieve', 'become', 'get', 'lose', 'gain', 'write', 'read', 'study', 'practice']
    const firstWord = normalized.split(' ')[0].toLowerCase()
    
    if (!verbs.includes(firstWord) && !normalized.startsWith('I want') && !normalized.startsWith('I would')) {
      // Add "Learn" if it seems like a learning goal
      if (normalized.toLowerCase().includes('python') || normalized.toLowerCase().includes('javascript') || normalized.toLowerCase().includes('programming')) {
        normalized = 'Learn ' + normalized
      }
    }
    
    return normalized
  }
}

export const spellCorrectionEngine = new SpellCorrectionEngine()
export type { SpellCorrectionResult, IntentSuggestion }