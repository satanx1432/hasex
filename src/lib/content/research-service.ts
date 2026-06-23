import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { groqService } from '../ai/groq'

export interface ResearchResult {
  summary: string
  keyPoints: string[]
  resources: Array<{
    title: string
    url: string
    description: string
    relevanceScore: number
  }>
  practicalApplications: string[]
  scrapedContent?: string[]
}

export interface WebScrapeResult {
  url: string
  title: string
  content: string
  success: boolean
  error?: string
}

export class ContentResearchService {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  async initialize(): Promise<void> {
    if (this.browser) return

    try {
      this.browser = await chromium.launch({
        headless: true,
      })
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      })
    } catch (error) {
      console.error('Failed to initialize Playwright:', error)
      throw new Error('Web scraping not available')
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.browser || !this.context) {
      await this.initialize()
    }
  }

  async scrapeUrl(url: string): Promise<WebScrapeResult> {
    await this.ensureInitialized()

    if (!this.context) {
      return {
        url,
        title: '',
        content: '',
        success: false,
        error: 'Browser context not initialized',
      }
    }

    const page = await this.context.newPage()

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })

      const title = await page.title()
      
      // Remove script and style elements
      await page.evaluate(() => {
        const elements = document.querySelectorAll('script, style, nav, footer, header, aside')
        elements.forEach(el => el.remove())
      })

      // Extract main content
      const content = await page.evaluate(() => {
        const mainContent = document.querySelector('main, article, .content, .post-content, .entry-content')
        if (mainContent) {
          return mainContent.textContent || ''
        }
        
        // Fallback to body
        return document.body?.textContent || ''
      })

      // Clean up content
      const cleanedContent = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
        .substring(0, 10000) // Limit to 10k characters

      await page.close()

      return {
        url,
        title,
        content: cleanedContent,
        success: true,
      }
    } catch (error) {
      await page.close()
      return {
        url,
        title: '',
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async scrapeMultipleUrls(urls: string[]): Promise<WebScrapeResult[]> {
    const results = await Promise.all(
      urls.map(url => this.scrapeUrl(url))
    )
    return results.filter(result => result.success)
  }

  async researchTopic(
    query: string,
    options: {
      goal?: string
      userLevel?: 'beginner' | 'intermediate' | 'advanced'
      contentTypes?: string[]
      maxUrls?: number
      scrapeContent?: boolean
    } = {}
  ): Promise<ResearchResult> {
    // First, use Groq to get initial research and potential URLs
    const initialResearch = await groqService.researchContent(query, {
      goal: options.goal,
      userLevel: options.userLevel,
      contentTypes: options.contentTypes,
    })

    let scrapedContent: string[] = []

    // If web scraping is enabled and we have URLs, scrape them
    if (options.scrapeContent && initialResearch.resources.length > 0) {
      const urlsToScrape = initialResearch.resources
        .slice(0, options.maxUrls || 3)
        .map(r => r.url)

      const scrapeResults = await this.scrapeMultipleUrls(urlsToScrape)
      scrapedContent = scrapeResults.map(r => r.content)

      // If we scraped content, enhance the research with it
      if (scrapedContent.length > 0) {
        const combinedContent = scrapedContent.join('\n\n')
        
        try {
          const enhancedResearch = await groqService.researchContent(
            `${query}\n\nAdditional content from web scraping:\n${combinedContent.substring(0, 5000)}`,
            {
              goal: options.goal,
              userLevel: options.userLevel,
              contentTypes: options.contentTypes,
            }
          )

          return {
            ...enhancedResearch,
            scrapedContent,
          }
        } catch (error) {
          console.error('Failed to enhance research with scraped content:', error)
        }
      }
    }

    return {
      ...initialResearch,
      scrapedContent,
    }
  }

  async generateQuizFromContent(content: string, numQuestions: number = 5): Promise<Array<{
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }>> {
    return groqService.generateContentQuestions(content, numQuestions)
  }

  async summarizeContent(content: string, maxLength: number = 500): Promise<string> {
    return groqService.summarizeContent(content, maxLength)
  }

  async extractInsights(content: string): Promise<string[]> {
    return groqService.extractKeyInsights(content)
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

export const contentResearchService = new ContentResearchService()