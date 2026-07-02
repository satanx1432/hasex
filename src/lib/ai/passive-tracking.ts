// ============================================
// BEHAVIORAL OS - PASSIVE TRACKING INTEGRATIONS
// Zero-friction tracking via external services
// ============================================

import { Task, TaskStatus } from '@/types/behavioral-os';

// ============================================
// GITHUB INTEGRATION
// ============================================

export interface GitHubActivity {
  type: 'commit' | 'pr' | 'issue' | 'star';
  repo: string;
  timestamp: Date;
  details: {
    message?: string;
    additions?: number;
    deletions?: number;
    filesChanged?: number;
  };
}

export class GitHubTracker {
  private accessToken: string;
  private username: string;

  constructor(accessToken: string, username: string) {
    this.accessToken = accessToken;
    this.username = username;
  }

  /**
   * Get recent commit activity
   */
  async getRecentCommits(days: number = 7): Promise<GitHubActivity[]> {
    try {
      const response = await fetch(
        `https://api.github.com/users/${this.username}/events?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) throw new Error('GitHub API error');

      const events = await response.json();
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      return events
        .filter((e: any) => e.type === 'PushEvent' && new Date(e.created_at) > cutoff)
        .flatMap((e: any) =>
          e.payload.commits.map((c: any) => ({
            type: 'commit' as const,
            repo: e.repo.name,
            timestamp: new Date(e.created_at),
            details: { message: c.message }
          }))
        );
    } catch (error) {
      console.error('GitHub tracking error:', error);
      return [];
    }
  }

  /**
   * Analyze coding patterns and suggest improvements
   */
  async analyzeCodingPatterns(): Promise<{
    totalCommits: number;
    mostActiveTime: string;
    streakDays: number;
    topRepos: string[];
    insights: string[];
  }> {
    const commits = await this.getRecentCommits(30);

    // Analyze patterns
    const commitsByHour: Record<number, number> = {};
    const repos: Record<string, number> = {};

    commits.forEach(c => {
      const hour = new Date(c.timestamp).getHours();
      commitsByHour[hour] = (commitsByHour[hour] || 0) + 1;
      repos[c.repo] = (repos[c.repo] || 0) + 1;
    });

    const mostActiveHour = Object.entries(commitsByHour)
      .sort((a, b) => b[1] - a[1])[0];

    const insights: string[] = [];
    if (commits.length > 50) {
      insights.push(`You've made ${commits.length} commits this month - excellent productivity!`);
    }
    if (mostActiveHour) {
      insights.push(`You code best around ${mostActiveHour[0]}:00. Schedule deep work then.`);
    }

    return {
      totalCommits: commits.length,
      mostActiveTime: mostActiveHour ? `${mostActiveHour[0]}:00` : 'Unknown',
      streakDays: this.calculateStreak(commits),
      topRepos: Object.entries(repos).sort((a, b) => b[1] - a[1]).slice(0, 5).map(r => r[0]),
      insights
    };
  }

  private calculateStreak(commits: GitHubActivity[]): number {
    if (commits.length === 0) return 0;

    const dates = [...new Set(commits.map(c => 
      new Date(c.timestamp).toDateString()
    ))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000);
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Auto-complete coding tasks based on GitHub activity
   */
  async checkTaskCompletion(task: Task): Promise<{
    completed: boolean;
    evidence: string;
    confidence: number;
  }> {
    const commits = await this.getRecentCommits(1);
    const todayCommits = commits.filter(c => 
      new Date(c.timestamp).toDateString() === new Date().toDateString()
    );

    if (todayCommits.length > 0) {
      return {
        completed: true,
        evidence: `Found ${todayCommits.length} commit(s) today: "${todayCommits[0].details.message}"`,
        confidence: 0.95
      };
    }

    return { completed: false, evidence: '', confidence: 0 };
  }
}

// ============================================
// HEALTH APP INTEGRATION (Apple Health / Google Fit)
// ============================================

export interface HealthData {
  steps?: number;
  activeMinutes?: number;
  sleepHours?: number;
  heartRate?: number;
  date: Date;
}

export class HealthTracker {
  private platform: 'apple' | 'google' | 'fitbit';
  private accessToken?: string;

  constructor(platform: 'apple' | 'google' | 'fitbit', accessToken?: string) {
    this.platform = platform;
    this.accessToken = accessToken;
  }

  /**
   * Get today's health metrics
   */
  async getTodayMetrics(): Promise<HealthData> {
    try {
      if (this.platform === 'apple') {
        return await this.getAppleHealthData();
      } else if (this.platform === 'google') {
        return await this.getGoogleFitData();
      }
      return { date: new Date() };
    } catch (error) {
      console.error('Health tracking error:', error);
      return { date: new Date() };
    }
  }

  private async getAppleHealthData(): Promise<HealthData> {
    // In production, use HealthKit SDK
    // For now, return mock data structure
    return {
      steps: 0,
      activeMinutes: 0,
      sleepHours: 7,
      date: new Date()
    };
  }

  private async getGoogleFitData(): Promise<HealthData> {
    if (!this.accessToken) {
      return { date: new Date() };
    }

    try {
      const response = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            aggregateBy: [
              { dataTypeName: 'com.google.step_count.delta' },
              { dataTypeName: 'com.google.active_minutes' },
              { dataTypeName: 'com.google.sleep.segment' }
            ],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: Date.now() - 86400000,
            endTimeMillis: Date.now()
          })
        }
      );

      const data = await response.json();
      // Process and return health data
      return { date: new Date() };
    } catch {
      return { date: new Date() };
    }
  }

  /**
   * Check if user is in optimal state for learning
   */
  async getOptimalLearningWindow(): Promise<{
    isOptimal: boolean;
    recommendation: string;
    energyScore: number;
  }> {
    const metrics = await this.getTodayMetrics();

    // Simple energy score calculation
    let energyScore = 50;
    
    if (metrics.sleepHours && metrics.sleepHours >= 7) energyScore += 20;
    else if (metrics.sleepHours && metrics.sleepHours < 6) energyScore -= 20;

    if (metrics.steps && metrics.steps >= 5000) energyScore += 15;
    if (metrics.heartRate && metrics.heartRate < 100) energyScore += 15;

    let recommendation = '';
    let isOptimal = energyScore >= 70;

    if (energyScore < 50) {
      recommendation = 'You seem tired. Try a 2-minute micro-task instead of your regular plan.';
      isOptimal = false;
    } else if (energyScore < 70) {
      recommendation = 'Your energy is moderate. Tackle easier tasks first.';
    } else {
      recommendation = 'You\'re in great shape! Perfect time for challenging work.';
    }

    return { isOptimal, recommendation, energyScore };
  }
}

// ============================================
// CALENDAR INTEGRATION
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'focus' | 'break' | 'other';
}

export class CalendarIntegration {
  private provider: 'google' | 'outlook' | 'apple';
  private accessToken?: string;

  constructor(provider: 'google' | 'outlook' | 'apple', accessToken?: string) {
    this.provider = provider;
    this.accessToken = accessToken;
  }

  /**
   * Get today's calendar events
   */
  async getTodayEvents(): Promise<CalendarEvent[]> {
    try {
      if (this.provider === 'google' && this.accessToken) {
        return await this.getGoogleCalendarEvents();
      }
      // Add other providers...
      return [];
    } catch (error) {
      console.error('Calendar error:', error);
      return [];
    }
  }

  private async getGoogleCalendarEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    const data = await response.json();
    
    return (data.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || 'Untitled',
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
      type: this.categorizeEvent(event)
    }));
  }

  private categorizeEvent(event: any): CalendarEvent['type'] {
    const title = (event.summary || '').toLowerCase();
    
    if (title.includes('meeting') || title.includes('call') || title.includes('sync')) {
      return 'meeting';
    }
    if (title.includes('focus') || title.includes('deep work')) {
      return 'focus';
    }
    if (title.includes('lunch') || title.includes('break')) {
      return 'break';
    }
    return 'other';
  }

  /**
   * Find free slots for learning
   */
  async findFreeSlots(durationMinutes: number): Promise<{
    start: Date;
    end: Date;
    quality: 'excellent' | 'good' | 'fair';
  }[]> {
    const events = await this.getTodayEvents();
    const slots: { start: Date; end: Date; quality: 'excellent' | 'good' | 'fair' }[] = [];
    
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    
    let currentTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 min from now
    
    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);
      
      // Check if slot is free
      const isFree = !events.some(e => 
        (currentTime >= e.start && currentTime < e.end) ||
        (slotEnd > e.start && slotEnd <= e.end)
      );
      
      if (isFree) {
        // Determine quality based on time of day
        const hour = currentTime.getHours();
        let quality: 'excellent' | 'good' | 'fair' = 'good';
        
        if (hour >= 9 && hour <= 11) quality = 'excellent';
        else if (hour >= 14 && hour <= 16) quality = 'excellent';
        else if (hour >= 6 && hour <= 8) quality = 'good';
        else quality = 'fair';
        
        slots.push({ start: new Date(currentTime), end: slotEnd, quality });
      }
      
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // Check every 30 min
    }
    
    return slots;
  }
}

// ============================================
// SCREEN TIME TRACKING
// ============================================

export interface ScreenTimeData {
  totalMinutes: number;
  topApps: { name: string; minutes: number }[];
  productiveMinutes: number;
  distractingMinutes: number;
}

export class ScreenTimeTracker {
  private platform: 'ios' | 'android' | 'desktop';

  constructor(platform: 'ios' | 'android' | 'desktop') {
    this.platform = platform;
  }

  /**
   * Get screen time data for today
   */
  async getTodayScreenTime(): Promise<ScreenTimeData> {
    try {
      if (this.platform === 'desktop') {
        return await this.getDesktopScreenTime();
      }
      // iOS/Android would use native APIs
      return { totalMinutes: 0, topApps: [], productiveMinutes: 0, distractingMinutes: 0 };
    } catch {
      return { totalMinutes: 0, topApps: [], productiveMinutes: 0, distractingMinutes: 0 };
    }
  }

  private async getDesktopScreenTime(): Promise<ScreenTimeData> {
    // In production, use a desktop app like RescueTime or custom tracking
    // For now, return mock data
    return {
      totalMinutes: 240,
      topApps: [
        { name: 'VS Code', minutes: 120 },
        { name: 'Chrome', minutes: 60 },
        { name: 'Slack', minutes: 30 }
      ],
      productiveMinutes: 180,
      distractingMinutes: 60
    };
  }

  /**
   * Suggest breaks based on screen time
   */
  async suggestBreak(): Promise<{
    shouldBreak: boolean;
    message: string;
    breakDuration: number;
  }> {
    const data = await this.getTodayScreenTime();
    
    // Suggest break after 90 minutes of continuous work
    if (data.totalMinutes > 0 && data.totalMinutes % 90 < 30) {
      return {
        shouldBreak: true,
        message: 'You\'ve been working for a while. Take a 5-minute break to recharge!',
        breakDuration: 5
      };
    }
    
    return { shouldBreak: false, message: '', breakDuration: 0 };
  }
}

// ============================================
// PASSIVE TRACKING ORCHESTRATOR
// ============================================

export class PassiveTrackingOrchestrator {
  private github?: GitHubTracker;
  private health?: HealthTracker;
  private calendar?: CalendarIntegration;
  private screenTime?: ScreenTimeTracker;

  configure(config: {
    github?: { token: string; username: string };
    health?: { platform: 'apple' | 'google' | 'fitbit'; token?: string };
    calendar?: { provider: 'google' | 'outlook' | 'apple'; token?: string };
    screenTime?: { platform: 'ios' | 'android' | 'desktop' };
  }) {
    if (config.github) {
      this.github = new GitHubTracker(config.github.token, config.github.username);
    }
    if (config.health) {
      this.health = new HealthTracker(config.health.platform, config.health.token);
    }
    if (config.calendar) {
      this.calendar = new CalendarIntegration(config.calendar.provider, config.calendar.token);
    }
    if (config.screenTime) {
      this.screenTime = new ScreenTimeTracker(config.screenTime.platform);
    }
  }

  /**
   * Check all integrations and auto-complete tasks
   */
  async checkTaskCompletions(tasks: Task[]): Promise<{
    taskId: string;
    autoCompleted: boolean;
    evidence: string;
  }[]> {
    const results: { taskId: string; autoCompleted: boolean; evidence: string }[] = [];

    for (const task of tasks) {
      // Check GitHub for coding tasks
      if (task.title.toLowerCase().includes('code') || 
          task.title.toLowerCase().includes('program') ||
          task.title.toLowerCase().includes('commit')) {
        if (this.github) {
          const result = await this.github.checkTaskCompletion(task);
          if (result.completed) {
            results.push({
              taskId: task.id,
              autoCompleted: true,
              evidence: result.evidence
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Get comprehensive status update
   */
  async getStatusUpdate(): Promise<{
    energyScore: number;
    freeSlots: number;
    screenTime: ScreenTimeData | null;
    githubActivity: number;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    // Check energy
    let energyScore = 70;
    if (this.health) {
      const energy = await this.health.getOptimalLearningWindow();
      energyScore = energy.energyScore;
      if (!energy.isOptimal) {
        recommendations.push(energy.recommendation);
      }
    }

    // Check calendar
    let freeSlots = 0;
    if (this.calendar) {
      const slots = await this.calendar.findFreeSlots(30);
      freeSlots = slots.length;
      if (slots.length === 0) {
        recommendations.push('Your calendar is packed. Try a 2-minute micro-task.');
      }
    }

    // Check screen time
    let screenTime: ScreenTimeData | null = null;
    if (this.screenTime) {
      screenTime = await this.screenTime.getTodayScreenTime();
      const breakSuggestion = await this.screenTime.suggestBreak();
      if (breakSuggestion.shouldBreak) {
        recommendations.push(breakSuggestion.message);
      }
    }

    // Check GitHub
    let githubActivity = 0;
    if (this.github) {
      const commits = await this.github.getRecentCommits(1);
      githubActivity = commits.length;
    }

    return {
      energyScore,
      freeSlots,
      screenTime,
      githubActivity,
      recommendations
    };
  }
}

// Export singleton
export const trackingOrchestrator = new PassiveTrackingOrchestrator();