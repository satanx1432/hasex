// ============================================
// BEHAVIORAL OS - AI BRAIN & INTERVENTION ENGINE
// The "Execution Engine" that pivots plans in real-time
// ============================================

import { 
  Goal, 
  Task, 
  Intervention, 
  InterventionType,
  InterventionTrigger,
  FailurePattern,
  DifficultyLevel,
  TaskStatus,
  CuratedResource,
  PerformanceReport,
  WeeklyReflection
} from '@/types/behavioral-os';

// ============================================
// INTERVENTION ENGINE
// ============================================

export class InterventionEngine {
  private failureThreshold = 3;
  private engagementDropThreshold = 0.2;
  private timeBufferHours = 2;

  /**
   * Analyze a goal and determine if intervention is needed
   */
  analyzeGoal(goal: Goal): Intervention | null {
    // Check for failure patterns
    const failureIntervention = this.checkFailurePatterns(goal);
    if (failureIntervention) return failureIntervention;

    // Check for engagement drop
    const engagementIntervention = this.checkEngagementDrop(goal);
    if (engagementIntervention) return engagementIntervention;

    // Check for time-based issues
    const timeIntervention = this.checkTimeIssues(goal);
    if (timeIntervention) return timeIntervention;

    return null;
  }

  /**
   * Check if tasks are failing repeatedly - trigger pivot
   */
  private checkFailurePatterns(goal: Goal): Intervention | null {
    const recentTasks = goal.milestones
      .flatMap(m => m.tasks)
      .filter(t => t.status === 'pending' || t.attempts > 0)
      .slice(-5);

    const failedTasks = recentTasks.filter(t => t.failureCount >= this.failureThreshold);
    
    if (failedTasks.length === 0) return null;

    // Find the pattern
    const pattern = this.identifyFailurePattern(failedTasks);
    
    return {
      id: `intervention-${Date.now()}`,
      goalId: goal.id,
      type: 'pivot',
      reason: `Task "${failedTasks[0].title}" has failed ${failedTasks[0].failureCount} times`,
      trigger: {
        type: 'failure_pattern',
        data: { taskId: failedTasks[0].id, failureCount: failedTasks[0].failureCount }
      },
      suggestedChange: this.generatePivotSuggestion(goal, failedTasks[0], pattern),
      newTask: this.createDowngradedTask(failedTasks[0]),
      confidence: 0.85
    };
  }

  /**
   * Check if user engagement has dropped
   */
  private checkEngagementDrop(goal: Goal): Intervention | null {
    const recentCompletionRate = this.calculateRecentCompletionRate(goal);
    const baselineRate = goal.successRate;
    
    if (recentCompletionRate < baselineRate * (1 - this.engagementDropThreshold)) {
      return {
        id: `intervention-${Date.now()}`,
        goalId: goal.id,
        type: 'rescue',
        reason: `Your engagement has dropped by ${Math.round((baselineRate - recentCompletionRate) * 100)}%`,
        trigger: {
          type: 'engagement_drop',
          data: { recentRate: recentCompletionRate, baselineRate }
        },
        suggestedChange: "Let's simplify your plan. Click below to activate the 'Stupid Small' mode.",
        confidence: 0.9
      };
    }

    return null;
  }

  /**
   * Check if tasks haven't been started and deadline is approaching
   */
  private checkTimeIssues(goal: Goal): Intervention | null {
    const now = new Date();
    const pendingTasks = goal.milestones
      .flatMap(m => m.tasks)
      .filter(t => t.status === 'pending' && t.scheduledTime);

    for (const task of pendingTasks) {
      if (!task.scheduledTime) continue;
      
      const scheduledDate = new Date(task.scheduledTime);
      const hoursUntilDue = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilDue < this.timeBufferHours && hoursUntilDue > 0 && task.status === 'pending') {
        return {
          id: `intervention-${Date.now()}`,
          goalId: goal.id,
          type: 'downgrade',
          reason: `Task "${task.title}" is due soon and you haven't started. Want the stupid-small version?`,
          trigger: {
            type: 'time_exceeded',
            data: { taskId: task.id, hoursRemaining: hoursUntilDue }
          },
          suggestedChange: `Instead of "${task.title}", try: 2-minute version`,
          newTask: this.createStupidSmallVersion(task),
          confidence: 0.95
        };
      }
    }

    return null;
  }

  /**
   * Identify the root cause of failure
   */
  private identifyFailurePattern(tasks: Task[]): FailurePattern {
    const commonIssues = {
      time: tasks.filter(t => t.estimatedMinutes > 30).length / tasks.length,
      complexity: tasks.filter(t => t.difficulty === 'hard' || t.difficulty === 'extreme').length / tasks.length,
      trigger: tasks.filter(t => t.triggerReliability < 50).length / tasks.length
    };

    const primaryIssue = Object.entries(commonIssues).reduce((a, b) => 
      b[1] > a[1] ? b : a
    );

    return {
      pattern: primaryIssue[0],
      frequency: primaryIssue[1],
      lastOccurrence: new Date(),
      suggestedFix: this.getFixForPattern(primaryIssue[0])
    };
  }

  private getFixForPattern(pattern: string): string {
    const fixes: Record<string, string> = {
      time: "Break into smaller chunks. Try the 2-minute rule.",
      complexity: "Learn prerequisites first. The task might be too advanced.",
      trigger: "Your trigger is too vague. Try: 'When I [specific action]' instead of 'When I feel like it'."
    };
    return fixes[pattern] || "Let's simplify and try again.";
  }

  /**
   * Generate a pivot suggestion based on failure analysis
   */
  private generatePivotSuggestion(goal: Goal, task: Task, pattern: FailurePattern): string {
    const suggestions = [
      `The task "${task.title}" seems too challenging. Let's learn a prerequisite skill first.`,
      `Your trigger for "${task.title}" might not be reliable. Let's try a different time/context.`,
      `This task requires ${task.estimatedMinutes} minutes. Let's break it into a 2-minute micro-task.`,
      `You've struggled with this ${task.failureCount} times. The AI suggests pivoting to a simpler approach.`
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  /**
   * Create a downgraded version of a task
   */
  private createDowngradedTask(task: Task): Partial<Task> {
    return {
      title: `Mini: ${task.title}`,
      description: task.description,
      estimatedMinutes: Math.max(2, Math.floor(task.estimatedMinutes * 0.1)),
      difficulty: 'stupid_small' as DifficultyLevel,
      isDowngraded: true,
      originalDifficulty: task.difficulty,
      status: 'pending' as TaskStatus
    };
  }

  /**
   * Create the "Stupid Small" version for exhausted users
   */
  private createStupidSmallVersion(task: Task): Partial<Task> {
    return {
      title: `2-min: ${task.title}`,
      description: `Ultra-simplified version. Just start for 2 minutes.`,
      estimatedMinutes: 2,
      difficulty: 'stupid_small' as DifficultyLevel,
      isDowngraded: true,
      status: 'pending' as TaskStatus
    };
  }

  private calculateRecentCompletionRate(goal: Goal): number {
    const recentTasks = goal.milestones
      .flatMap(m => m.tasks)
      .slice(-10);
    
    if (recentTasks.length === 0) return 1;
    
    const completed = recentTasks.filter(t => t.status === 'completed').length;
    return completed / recentTasks.length;
  }
}

// ============================================
// RESOURCE CURATOR - High-Yield Source Grounding
// ============================================

export class ResourceCurator {
  /**
   * Analyze resources and extract high-yield sections
   */
  async curateResources(resources: CuratedResource[]): Promise<CuratedResource[]> {
    return resources
      .map(r => this.scoreResource(r))
      .sort((a, b) => b.highYieldScore - a.highYieldScore);
  }

  /**
   * Score a resource by time-to-value ratio
   */
  private scoreResource(resource: CuratedResource): CuratedResource {
    const baseScore = resource.communityRating * 20;
    const timePenalty = resource.timeToValue * 2;
    const usageBonus = Math.min(resource.completionRate * 10, 20);
    
    return {
      ...resource,
      highYieldScore: Math.max(0, Math.min(100, baseScore - timePenalty + usageBonus))
    };
  }

  /**
   * Extract the most valuable sections from a resource
   */
  extractHighYieldSections(resource: CuratedResource, content: string): string[] {
    // AI would analyze the content here
    // For now, return key sections based on common patterns
    const sections: string[] = [];
    
    // Look for headers, bold text, numbered lists
    const patterns = [
      /#{1,3}\s+(.+)/g,  // Headers
      /\*\*(.+?)\*\*/g,   // Bold
      /\d+\.\s+(.+)/g,   // Numbered lists
      /[-•]\s+(.+)/g     // Bullet points
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        sections.push(...matches.slice(0, 5));
      }
    }

    return sections.slice(0, 10);
  }

  /**
   * Generate a summary for quick catch-up
   */
  generateCatchUpSummary(missedDays: number, goal: Goal): string {
    const missedTasks = goal.milestones
      .flatMap(m => m.tasks)
      .filter(t => t.status === 'skipped' || 
        (t.scheduledTime && new Date(t.scheduledTime) < new Date(Date.now() - missedDays * 24 * 60 * 60 * 1000)));

    if (missedTasks.length === 0) {
      return "You're all caught up! No missed tasks.";
    }

    return `You missed ${missedTasks.length} tasks over ${missedDays} days. ` +
      `Here's your 5-minute catch-up: ` +
      missedTasks.slice(0, 3).map(t => t.title).join(', ') +
      (missedTasks.length > 3 ? ` and ${missedTasks.length - 3} more` : '');
  }
}

// ============================================
// IMPLEMENTATION INTENTION AUDITOR
// ============================================

export class ImplementationIntentionAuditor {
  /**
   * Audit and improve If-Then triggers
   */
  auditTrigger(trigger: { type: string; condition: string }): { valid: boolean; suggestion?: string } {
    const vagueTriggers = [
      'when i feel like it',
      'when i have time',
      'when i remember',
      'when i\'m motivated',
      'when i want to',
      'later',
      'sometime'
    ];

    const isVague = vagueTriggers.some(v => 
      trigger.condition.toLowerCase().includes(v)
    );

    if (isVague) {
      return {
        valid: false,
        suggestion: `Your trigger "${trigger.condition}" is too vague. Try: "When I [specific action]" like "When I finish my morning coffee" or "When I close my laptop at 5pm".`
      };
    }

    return { valid: true };
  }

  /**
   * Suggest better triggers based on context
   */
  suggestBetterTriggers(goal: string, failedTriggers: string[]): string[] {
    const suggestions: Record<string, string[]> = {
      default: [
        'When I finish my morning routine',
        'When I sit down at my desk',
        'After I eat lunch',
        'When I close a specific app',
        'At [specific time] every [day]'
      ]
    };

    // Context-aware suggestions based on goal type
    if (goal.toLowerCase().includes('code') || goal.toLowerCase().includes('programming')) {
      suggestions.programming = [
        'When I open VS Code',
        'After I commit to GitHub',
        'When I finish a meeting',
        'Before I check social media'
      ];
    }

    if (goal.toLowerCase().includes('exercise') || goal.toLowerCase().includes('fitness')) {
      suggestions.fitness = [
        'When my alarm goes off',
        'After I brush my teeth in the morning',
        'When I get home from work',
        'Before my morning shower'
      ];
    }

    return suggestions.default; // Return default for now
  }
}

// ============================================
// PERFORMANCE ANALYZER
// ============================================

export class PerformanceAnalyzer {
  /**
   * Generate comprehensive performance report
   */
  analyzePerformance(goal: Goal, days: number = 7): PerformanceReport {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const allTasks = goal.milestones.flatMap(m => m.tasks);
    const periodTasks = allTasks.filter(t => 
      t.scheduledTime && new Date(t.scheduledTime) >= startDate
    );

    const completedTasks = periodTasks.filter(t => t.status === 'completed');
    const failedTasks = periodTasks.filter(t => t.failureCount >= 3);

    return {
      goalId: goal.id,
      period: { start: startDate, end: now },
      tasksCompleted: completedTasks.length,
      tasksFailed: failedTasks.length,
      completionRate: periodTasks.length > 0 ? completedTasks.length / periodTasks.length : 0,
      totalTimeSpent: completedTasks.reduce((sum, t) => sum + (t.actualMinutes || t.estimatedMinutes), 0),
      averageSessionLength: completedTasks.length > 0 
        ? completedTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / completedTasks.length 
        : 0,
      bestDay: this.findBestDay(goal),
      bestTime: this.findBestTime(goal),
      triggerReliability: this.calculateTriggerReliability(goal),
      strengths: this.identifyStrengths(goal),
      weaknesses: this.identifyWeaknesses(goal),
      recommendations: this.generateRecommendations(goal),
      milestonesCompleted: goal.milestones.filter(m => m.status === 'completed').length,
      levelProgress: (goal.currentLevel / goal.totalLevels) * 100
    };
  }

  private findBestDay(goal: Goal): string {
    // Analyze completion patterns by day of week
    const dayStats: Record<string, { completed: number; total: number }> = {};
    
    goal.milestones.flatMap(m => m.tasks)
      .filter(t => t.completedAt)
      .forEach(t => {
        const day = new Date(t.completedAt!).toLocaleDateString('en-US', { weekday: 'long' });
        if (!dayStats[day]) dayStats[day] = { completed: 0, total: 0 };
        dayStats[day].completed++;
        dayStats[day].total++;
      });

    const best = Object.entries(dayStats)
      .sort((a, b) => b[1].completed / b[1].total - a[1].completed / a[1].total)[0];
    
    return best ? best[0] : 'Tuesday';
  }

  private findBestTime(goal: Goal): string {
    // Analyze completion patterns by hour
    const hourStats: Record<number, number> = {};
    
    goal.milestones.flatMap(m => m.tasks)
      .filter(t => t.completedAt)
      .forEach(t => {
        const hour = new Date(t.completedAt!).getHours();
        hourStats[hour] = (hourStats[hour] || 0) + 1;
      });

    const best = Object.entries(hourStats)
      .sort((a, b) => b[1] - a[1])[0];
    
    return best ? `${best[0]}:00` : '9:00 AM';
  }

  private calculateTriggerReliability(goal: Goal): number {
    const tasks = goal.milestones.flatMap(m => m.tasks);
    const tasksWithTriggers = tasks.filter(t => t.trigger);
    
    if (tasksWithTriggers.length === 0) return 100;
    
    const avgReliability = tasksWithTriggers.reduce((sum, t) => 
      sum + (t.trigger?.reliability || 0), 0) / tasksWithTriggers.length;
    
    return Math.round(avgReliability);
  }

  private identifyStrengths(goal: Goal): string[] {
    const strengths: string[] = [];
    
    if (goal.streakCount > 7) strengths.push(`Amazing consistency! ${goal.streakCount}-day streak`);
    if (goal.successRate > 0.8) strengths.push('High task completion rate');
    
    const avgTriggerReliability = this.calculateTriggerReliability(goal);
    if (avgTriggerReliability > 70) strengths.push('Strong trigger implementation');
    
    return strengths.length > 0 ? strengths : ['You\'re showing great potential!'];
  }

  private identifyWeaknesses(goal: Goal): string[] {
    const weaknesses: string[] = [];
    
    const failedTasks = goal.milestones
      .flatMap(m => m.tasks)
      .filter(t => t.failureCount >= 3);
    
    if (failedTasks.length > 0) {
      weaknesses.push(`${failedTasks.length} tasks consistently failing - needs pivot`);
    }
    
    const avgTriggerReliability = this.calculateTriggerReliability(goal);
    if (avgTriggerReliability < 50) {
      weaknesses.push('Triggers not reliable - try more specific conditions');
    }
    
    return weaknesses.length > 0 ? weaknesses : [];
  }

  private generateRecommendations(goal: Goal): string[] {
    const recommendations: string[] = [];
    
    // Based on best day/time
    recommendations.push(`Schedule important tasks on ${this.findBestDay(goal)}s around ${this.findBestTime(goal)}`);
    
    // Based on trigger reliability
    if (this.calculateTriggerReliability(goal) < 70) {
      recommendations.push('Consider using time-based triggers instead of location-based ones');
    }
    
    // Based on failure patterns
    const failedTasks = goal.milestones
      .flatMap(m => m.tasks)
      .filter(t => t.failureCount >= 3);
    
    if (failedTasks.length > 0) {
      recommendations.push(`Break down "${failedTasks[0].title}" into smaller micro-tasks`);
    }
    
    return recommendations;
  }
}

// ============================================
// WEEKLY REFLECTION GENERATOR
// ============================================

export class WeeklyReflectionGenerator {
  /**
   * Generate weekly reflection questions
   */
  generateReflectionQuestions(): string[] {
    return [
      'What was your biggest win this week?',
      'What held you back the most?',
      'What will you do differently next week?',
      'Did your triggers work as expected?',
      'How is your energy levels throughout the week?'
    ];
  }

  /**
   * Generate AI coaching notes based on the week
   */
  generateCoachingNotes(report: PerformanceReport): string {
    let notes = '';
    
    if (report.completionRate > 0.8) {
      notes += '🎉 Excellent week! You\'re building strong momentum. ';
    } else if (report.completionRate > 0.5) {
      notes += '💪 Good progress. You\'re on the right track. ';
    } else {
      notes += '🔄 This week had challenges. Let\'s simplify your plan. ';
    }
    
    if (report.triggerReliability < 50) {
      notes += 'Your triggers need work - try the "After I [specific action]" format. ';
    }
    
    if (report.tasksFailed > 0) {
      notes += `Consider pivoting on ${report.tasksFailed} task(s) that keep failing. `;
    }
    
    notes += `Best performance was on ${report.bestDay}s around ${report.bestTime}.`;
    
    return notes;
  }
}

// ============================================
// VOICE BRAIN DUMP PROCESSOR
// ============================================

export class VoiceBrainDumpProcessor {
  /**
   * Process voice/audio input and extract If-Then triggers
   */
  async processBrainDump(transcript: string): Promise<{
    goal?: string;
    triggers: { if: string; then: string }[];
    tasks: string[];
  }> {
    // Extract If-Then patterns
    const ifThenPattern = /(?:if|when|whenever|after)\s+(.+?)(?:\s+then\s+|\s*,\s*then\s+)(.+?)(?:\.|$)/gi;
    const triggers: { if: string; then: string }[] = [];
    
    let match;
    while ((match = ifThenPattern.exec(transcript)) !== null) {
      triggers.push({ if: match[1].trim(), then: match[2].trim() });
    }

    // Extract goal
    const goalMatch = transcript.match(/(?:i want to|i\'m learning|i\'m working on|i\'m trying to|my goal is)\s+(.+?)(?:\.|$)/i);
    const goal = goalMatch ? goalMatch[1].trim() : undefined;

    // Extract potential tasks (bullet points, numbered items)
    const taskPattern = /(?:^|\n)\s*[-*•]\s*(.+?)(?:\n|$)/g;
    const tasks: string[] = [];
    let taskMatch;
    while ((taskMatch = taskPattern.exec(transcript)) !== null) {
      tasks.push(taskMatch[1].trim());
    }

    return { goal, triggers, tasks };
  }
}

// ============================================
// CHURN PREDICTOR
// ============================================

export class ChurnPredictor {
  /**
   * Predict if user is about to churn
   */
  predictChurn(goal: Goal, engagementHistory: { date: Date; active: boolean }[]): {
    atRisk: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    rescueSequence?: string;
  } {
    const recentEngagement = engagementHistory.slice(-7);
    const activeDays = recentEngagement.filter(e => e.active).length;
    const engagementRate = activeDays / 7;

    if (engagementRate < 0.3) {
      return {
        atRisk: true,
        riskLevel: 'high',
        rescueSequence: 'URGENT: Your engagement has dropped significantly. Let\'s simplify your goals to just 2 minutes per day.'
      };
    }

    if (engagementRate < 0.5) {
      return {
        atRisk: true,
        riskLevel: 'medium',
        rescueSequence: 'We noticed you\'ve been less active. Want to activate "Easy Mode" for the next few days?'
      };
    }

    return { atRisk: false, riskLevel: 'low' };
  }
}

// Export singleton instances
export const interventionEngine = new InterventionEngine();
export const resourceCurator = new ResourceCurator();
export const intentionAuditor = new ImplementationIntentionAuditor();
export const performanceAnalyzer = new PerformanceAnalyzer();
export const reflectionGenerator = new WeeklyReflectionGenerator();
export const brainDumpProcessor = new VoiceBrainDumpProcessor();
export const churnPredictor = new ChurnPredictor();