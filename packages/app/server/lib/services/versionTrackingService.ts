import type {
  ResumeVersion,
  ResumeAnalytics,
  PerformanceMetrics,
  ParsedResumeContent
} from '../models/resumeModels';

export interface VersionDiff {
  section: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue?: string;
  newValue?: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface AnalyticsReport {
  overview: {
    totalVersions: number;
    totalAnalyses: number;
    averageScore: number;
    improvementTrend: number;
  };
  versionHistory: {
    version: number;
    date: string;
    score: number;
    changes: number;
    majorChanges: string[];
  }[];
  recommendations: {
    nextSteps: string[];
    focusAreas: string[];
    successMetrics: string[];
  };
  performance: PerformanceMetrics;
}

export interface VersionComparisonResult {
  oldVersion: ResumeVersion;
  newVersion: ResumeVersion;
  differences: VersionDiff[];
  improvementAreas: string[];
  regressionAreas: string[];
  overallImpact: 'positive' | 'negative' | 'neutral';
  scoreChange: number;
}

export class VersionTrackingService {

  static async createNewVersion(
    resumeId: string,
    content: string,
    parsedContent: ParsedResumeContent,
    changes: string[],
    userId: string
  ): Promise<ResumeVersion> {
    try {
      // Get current version number
      const currentVersion = await this.getCurrentVersionNumber(resumeId);

      const newVersion: ResumeVersion = {
        id: crypto.randomUUID(),
        resumeId,
        version: currentVersion + 1,
        content,
        parsedContent,
        changes,
        createdAt: new Date().toISOString(),
        createdBy: userId
      };

      // Store version (in a real implementation, this would save to database)
      await this.storeVersion(newVersion);

      return newVersion;

    } catch (error) {
      console.error('Error creating new version:', error);
      throw new Error(`Failed to create version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async compareVersions(
    oldVersionId: string,
    newVersionId: string
  ): Promise<VersionComparisonResult> {
    try {
      const oldVersion = await this.getVersion(oldVersionId);
      const newVersion = await this.getVersion(newVersionId);

      if (!oldVersion || !newVersion) {
        throw new Error('One or both versions not found');
      }

      const differences = await this.calculateDifferences(oldVersion, newVersion);
      const improvementAreas = this.identifyImprovements(differences);
      const regressionAreas = this.identifyRegressions(differences);
      const overallImpact = this.determineOverallImpact(differences);

      // Calculate score change (simplified)
      const scoreChange = await this.calculateScoreChange(oldVersion, newVersion);

      return {
        oldVersion,
        newVersion,
        differences,
        improvementAreas,
        regressionAreas,
        overallImpact,
        scoreChange
      };

    } catch (error) {
      console.error('Error comparing versions:', error);
      throw new Error(`Version comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getVersionHistory(resumeId: string, limit: number = 10): Promise<ResumeVersion[]> {
    try {
      // In a real implementation, this would query the database
      const versions = await this.fetchVersionsFromDatabase(resumeId);

      return versions
        .sort((a, b) => b.version - a.version)
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching version history:', error);
      return [];
    }
  }

  static async generateAnalyticsReport(resumeId: string): Promise<AnalyticsReport> {
    try {
      const versions = await this.getVersionHistory(resumeId, 50);
      const analytics = await this.getResumeAnalytics(resumeId);

      if (!analytics) {
        throw new Error('Analytics not found');
      }

      const versionHistory = versions.map(version => ({
        version: version.version,
        date: version.createdAt,
        score: this.estimateVersionScore(version), // Simplified scoring
        changes: version.changes.length,
        majorChanges: version.changes.slice(0, 3)
      }));

      const averageScore = versionHistory.reduce((sum, v) => sum + v.score, 0) / versionHistory.length || 0;
      const improvementTrend = this.calculateImprovementTrend(versionHistory);

      const recommendations = await this.generateRecommendations(versions, analytics);

      return {
        overview: {
          totalVersions: versions.length,
          totalAnalyses: analytics.analyses,
          averageScore: Math.round(averageScore),
          improvementTrend
        },
        versionHistory: versionHistory.slice(0, 10),
        recommendations,
        performance: analytics.performanceMetrics
      };

    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw new Error(`Analytics report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async trackResumeView(resumeId: string): Promise<void> {
    try {
      const analytics = await this.getResumeAnalytics(resumeId) || await this.createInitialAnalytics(resumeId);

      analytics.views += 1;
      analytics.lastViewed = new Date().toISOString();

      await this.updateAnalytics(analytics);

    } catch (error) {
      console.error('Error tracking resume view:', error);
    }
  }

  static async trackResumeDownload(resumeId: string): Promise<void> {
    try {
      const analytics = await this.getResumeAnalytics(resumeId) || await this.createInitialAnalytics(resumeId);

      analytics.downloads += 1;

      await this.updateAnalytics(analytics);

    } catch (error) {
      console.error('Error tracking resume download:', error);
    }
  }

  static async trackAnalysisRun(resumeId: string, analysisScore: number): Promise<void> {
    try {
      const analytics = await this.getResumeAnalytics(resumeId) || await this.createInitialAnalytics(resumeId);

      analytics.analyses += 1;

      // Update performance metrics
      const currentAvg = analytics.performanceMetrics.averageAnalysisScore;
      const totalAnalyses = analytics.analyses;

      analytics.performanceMetrics.averageAnalysisScore =
        ((currentAvg * (totalAnalyses - 1)) + analysisScore) / totalAnalyses;

      // Update improvement trend
      analytics.performanceMetrics.improvementTrend = this.calculateScoreTrend(
        analytics.performanceMetrics.averageAnalysisScore,
        analysisScore
      );

      await this.updateAnalytics(analytics);

    } catch (error) {
      console.error('Error tracking analysis run:', error);
    }
  }

  static async identifyVersionImpacts(
    oldVersion: ResumeVersion,
    newVersion: ResumeVersion,
    env: Env
  ): Promise<{
    positiveImpacts: string[];
    negativeImpacts: string[];
    neutralChanges: string[];
    recommendations: string[];
  }> {
    try {
      const differences = await this.calculateDifferences(oldVersion, newVersion);

      const positiveImpacts: string[] = [];
      const negativeImpacts: string[] = [];
      const neutralChanges: string[] = [];

      for (const diff of differences) {
        switch (diff.impact) {
          case 'high':
            if (diff.changeType === 'added' || (diff.changeType === 'modified' && diff.newValue && diff.newValue.length > (diff.oldValue?.length || 0))) {
              positiveImpacts.push(diff.description);
            } else {
              negativeImpacts.push(diff.description);
            }
            break;
          case 'medium':
            positiveImpacts.push(diff.description);
            break;
          case 'low':
            neutralChanges.push(diff.description);
            break;
        }
      }

      const recommendations = await this.generateVersionRecommendations(env, differences, newVersion);

      return {
        positiveImpacts,
        negativeImpacts,
        neutralChanges,
        recommendations
      };

    } catch (error) {
      console.error('Error identifying version impacts:', error);
      return {
        positiveImpacts: [],
        negativeImpacts: [],
        neutralChanges: [],
        recommendations: []
      };
    }
  }

  private static async getCurrentVersionNumber(resumeId: string): Promise<number> {
    // In a real implementation, this would query the database
    const versions = await this.fetchVersionsFromDatabase(resumeId);
    return versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0;
  }

  private static async storeVersion(version: ResumeVersion): Promise<void> {
    // In a real implementation, this would save to database
    // For now, we'll simulate storage
    console.log(`Stored version ${version.version} for resume ${version.resumeId}`);
  }

  private static async getVersion(versionId: string): Promise<ResumeVersion | null> {
    // Mock implementation - in real app, this would query database
    return {
      id: versionId,
      resumeId: 'mock-resume-id',
      version: 1,
      content: 'Mock resume content',
      parsedContent: {
        personalInfo: { name: 'John Doe' },
        experience: [],
        education: [],
        skills: []
      },
      changes: ['Initial version'],
      createdAt: new Date().toISOString(),
      createdBy: 'user-id'
    };
  }

  private static async fetchVersionsFromDatabase(resumeId: string): Promise<ResumeVersion[]> {
    // Mock implementation
    return [];
  }

  private static async calculateDifferences(
    oldVersion: ResumeVersion,
    newVersion: ResumeVersion
  ): Promise<VersionDiff[]> {
    const differences: VersionDiff[] = [];

    // Compare parsed content
    const oldParsed = oldVersion.parsedContent;
    const newParsed = newVersion.parsedContent;

    // Compare skills
    const oldSkills = new Set(oldParsed.skills);
    const newSkills = new Set(newParsed.skills);

    // Added skills
    for (const skill of newSkills) {
      if (!oldSkills.has(skill)) {
        differences.push({
          section: 'Skills',
          changeType: 'added',
          newValue: skill,
          impact: 'medium',
          description: `Added skill: ${skill}`
        });
      }
    }

    // Removed skills
    for (const skill of oldSkills) {
      if (!newSkills.has(skill)) {
        differences.push({
          section: 'Skills',
          changeType: 'removed',
          oldValue: skill,
          impact: 'low',
          description: `Removed skill: ${skill}`
        });
      }
    }

    // Compare experience
    if (newParsed.experience.length > oldParsed.experience.length) {
      differences.push({
        section: 'Experience',
        changeType: 'added',
        newValue: 'New work experience',
        impact: 'high',
        description: `Added ${newParsed.experience.length - oldParsed.experience.length} new work experience(s)`
      });
    }

    // Compare summary
    if (oldParsed.summary !== newParsed.summary) {
      differences.push({
        section: 'Summary',
        changeType: 'modified',
        oldValue: oldParsed.summary,
        newValue: newParsed.summary,
        impact: 'high',
        description: 'Updated professional summary'
      });
    }

    return differences;
  }

  private static identifyImprovements(differences: VersionDiff[]): string[] {
    return differences
      .filter(diff => diff.changeType === 'added' || (diff.changeType === 'modified' && diff.impact === 'high'))
      .map(diff => diff.description)
      .slice(0, 5);
  }

  private static identifyRegressions(differences: VersionDiff[]): string[] {
    return differences
      .filter(diff => diff.changeType === 'removed' && diff.impact !== 'low')
      .map(diff => diff.description)
      .slice(0, 3);
  }

  private static determineOverallImpact(differences: VersionDiff[]): 'positive' | 'negative' | 'neutral' {
    const positive = differences.filter(d => d.changeType === 'added' || (d.changeType === 'modified' && d.impact === 'high')).length;
    const negative = differences.filter(d => d.changeType === 'removed' && d.impact !== 'low').length;

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  private static async calculateScoreChange(oldVersion: ResumeVersion, newVersion: ResumeVersion): Promise<number> {
    // Simplified score calculation based on content changes
    const oldScore = this.estimateVersionScore(oldVersion);
    const newScore = this.estimateVersionScore(newVersion);

    return newScore - oldScore;
  }

  private static estimateVersionScore(version: ResumeVersion): number {
    const parsed = version.parsedContent;

    let score = 50; // Base score

    if (parsed.summary && parsed.summary.length > 50) score += 15;
    score += Math.min(20, parsed.experience.length * 5);
    score += Math.min(15, parsed.skills.length * 2);
    score += Math.min(10, parsed.education.length * 5);

    return Math.min(100, score);
  }

  private static async getResumeAnalytics(resumeId: string): Promise<ResumeAnalytics | null> {
    // Mock implementation
    return {
      id: crypto.randomUUID(),
      resumeId,
      views: 0,
      downloads: 0,
      analyses: 0,
      performanceMetrics: {
        averageAnalysisScore: 0,
        improvementTrend: 0,
        mostCommonIssues: [],
        strengthAreas: []
      }
    };
  }

  private static async createInitialAnalytics(resumeId: string): Promise<ResumeAnalytics> {
    const analytics: ResumeAnalytics = {
      id: crypto.randomUUID(),
      resumeId,
      views: 0,
      downloads: 0,
      analyses: 0,
      performanceMetrics: {
        averageAnalysisScore: 0,
        improvementTrend: 0,
        mostCommonIssues: [],
        strengthAreas: []
      }
    };

    await this.updateAnalytics(analytics);
    return analytics;
  }

  private static async updateAnalytics(analytics: ResumeAnalytics): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Updated analytics for resume ${analytics.resumeId}`);
  }

  private static calculateImprovementTrend(versionHistory: any[]): number {
    if (versionHistory.length < 2) return 0;

    const recent = versionHistory.slice(0, 5);
    const older = versionHistory.slice(-5);

    const recentAvg = recent.reduce((sum, v) => sum + v.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v.score, 0) / older.length;

    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
  }

  private static calculateScoreTrend(currentAverage: number, newScore: number): number {
    if (currentAverage === 0) return 0;
    return Math.round(((newScore - currentAverage) / currentAverage) * 100);
  }

  private static async generateRecommendations(
    versions: ResumeVersion[],
    analytics: ResumeAnalytics
  ): Promise<{
    nextSteps: string[];
    focusAreas: string[];
    successMetrics: string[];
  }> {
    const nextSteps: string[] = [];
    const focusAreas: string[] = [];
    const successMetrics: string[] = [];

    if (versions.length < 2) {
      nextSteps.push('Create different versions to track improvement over time');
    }

    if (analytics.analyses < 5) {
      nextSteps.push('Run more comprehensive analyses to identify improvement areas');
    }

    focusAreas.push('Content optimization', 'ATS compatibility', 'Keyword enhancement');
    successMetrics.push('Analysis score improvement', 'Version consistency', 'Content completeness');

    return { nextSteps, focusAreas, successMetrics };
  }

  private static async generateVersionRecommendations(
    env: Env,
    differences: VersionDiff[],
    newVersion: ResumeVersion
  ): Promise<string[]> {
    try {
      const prompt = `Based on these resume changes, provide 3-5 actionable recommendations:

      Changes made:
      ${differences.map(diff => `- ${diff.description}`).join('\n')}

      Current resume sections:
      - Experience: ${newVersion.parsedContent.experience.length} entries
      - Skills: ${newVersion.parsedContent.skills.length} skills
      - Education: ${newVersion.parsedContent.education.length} entries

      What should be the next focus areas for improvement?`;

      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'Provide specific, actionable resume improvement recommendations based on recent changes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return (response.response || response)
        .split('\n')
        .filter((line: string) => line.trim() && line.match(/^[-*•\d+\.]/))
        .map((line: string) => line.replace(/^[-*•\d+\.]\s*/, '').trim())
        .slice(0, 5);

    } catch (error) {
      console.error('Error generating version recommendations:', error);
      return [
        'Continue to quantify achievements with specific metrics',
        'Keep skills section updated with relevant technologies',
        'Ensure consistent formatting across all sections'
      ];
    }
  }

  static async exportVersionHistory(resumeId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const versions = await this.getVersionHistory(resumeId, 100);

      if (format === 'csv') {
        const headers = 'Version,Date,Changes,Created By\n';
        const rows = versions.map(v =>
          `${v.version},"${v.createdAt}","${v.changes.join('; ')}","${v.createdBy}"`
        ).join('\n');

        return headers + rows;
      }

      return JSON.stringify(versions, null, 2);

    } catch (error) {
      console.error('Error exporting version history:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}