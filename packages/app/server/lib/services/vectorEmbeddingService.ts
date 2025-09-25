import type { ParsedResumeContent } from '../models/resumeModels';

export interface VectorEmbedding {
  id: string;
  values: number[];
  metadata: {
    resumeId: string;
    section: string;
    content: string;
    type: 'resume' | 'job_description' | 'template';
    timestamp: string;
  };
}

export interface SemanticMatch {
  id: string;
  score: number;
  content: string;
  section: string;
  type: string;
  metadata: Record<string, any>;
}

export interface VectorSearchResult {
  matches: SemanticMatch[];
  totalCount: number;
  searchTime: number;
}

export interface JobMatchResult {
  overallScore: number;
  sectionScores: {
    summary: number;
    experience: number;
    skills: number;
    education: number;
  };
  missingKeywords: string[];
  strongMatches: string[];
  recommendations: string[];
}

export class VectorEmbeddingService {

  static async generateResumeEmbeddings(
    env: Env,
    resumeId: string,
    parsedContent: ParsedResumeContent
  ): Promise<VectorEmbedding[]> {
    const embeddings: VectorEmbedding[] = [];

    try {
      // Generate embeddings for different resume sections
      if (parsedContent.summary) {
        const summaryEmbedding = await this.generateTextEmbedding(env, parsedContent.summary);
        embeddings.push({
          id: `${resumeId}_summary`,
          values: summaryEmbedding,
          metadata: {
            resumeId,
            section: 'summary',
            content: parsedContent.summary,
            type: 'resume',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Experience embeddings
      for (let i = 0; i < parsedContent.experience.length; i++) {
        const exp = parsedContent.experience[i];
        const expText = `${exp.title} at ${exp.company}. ${exp.description}`;
        const expEmbedding = await this.generateTextEmbedding(env, expText);

        embeddings.push({
          id: `${resumeId}_exp_${i}`,
          values: expEmbedding,
          metadata: {
            resumeId,
            section: 'experience',
            content: expText,
            type: 'resume',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Skills embedding
      if (parsedContent.skills.length > 0) {
        const skillsText = parsedContent.skills.join(', ');
        const skillsEmbedding = await this.generateTextEmbedding(env, skillsText);

        embeddings.push({
          id: `${resumeId}_skills`,
          values: skillsEmbedding,
          metadata: {
            resumeId,
            section: 'skills',
            content: skillsText,
            type: 'resume',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Education embeddings
      for (let i = 0; i < parsedContent.education.length; i++) {
        const edu = parsedContent.education[i];
        const eduText = `${edu.degree} from ${edu.institution}`;
        const eduEmbedding = await this.generateTextEmbedding(env, eduText);

        embeddings.push({
          id: `${resumeId}_edu_${i}`,
          values: eduEmbedding,
          metadata: {
            resumeId,
            section: 'education',
            content: eduText,
            type: 'resume',
            timestamp: new Date().toISOString()
          }
        });
      }

      return embeddings;

    } catch (error) {
      console.error('Error generating resume embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async storeEmbeddings(
    env: Env,
    embeddings: VectorEmbedding[]
  ): Promise<{ success: boolean; storedCount: number; error?: string }> {
    try {
      // Store embeddings in Cloudflare Vectorize
      // Note: This assumes you have a Vectorize binding set up in your environment

      const vectorizeIndex = env.RESUME_VECTORIZE_INDEX;

      if (!vectorizeIndex) {
        throw new Error('Vectorize index not configured');
      }

      let storedCount = 0;
      const batchSize = 100; // Vectorize batch limit

      for (let i = 0; i < embeddings.length; i += batchSize) {
        const batch = embeddings.slice(i, i + batchSize);

        await vectorizeIndex.upsert(batch.map(embedding => ({
          id: embedding.id,
          values: embedding.values,
          metadata: embedding.metadata
        })));

        storedCount += batch.length;
      }

      return { success: true, storedCount };

    } catch (error) {
      console.error('Error storing embeddings:', error);
      return {
        success: false,
        storedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async searchSimilarContent(
    env: Env,
    queryText: string,
    options: {
      topK?: number;
      filter?: Record<string, any>;
      includeMetadata?: boolean;
    } = {}
  ): Promise<VectorSearchResult> {
    const startTime = Date.now();

    try {
      const { topK = 10, filter, includeMetadata = true } = options;

      // Generate embedding for query text
      const queryEmbedding = await this.generateTextEmbedding(env, queryText);

      const vectorizeIndex = env.RESUME_VECTORIZE_INDEX;
      if (!vectorizeIndex) {
        throw new Error('Vectorize index not configured');
      }

      // Search for similar vectors
      const searchResults = await vectorizeIndex.query(queryEmbedding, {
        topK,
        filter,
        includeMetadata,
        returnValues: false
      });

      const matches: SemanticMatch[] = searchResults.matches.map(match => ({
        id: match.id,
        score: match.score,
        content: match.metadata?.content || '',
        section: match.metadata?.section || 'unknown',
        type: match.metadata?.type || 'unknown',
        metadata: match.metadata || {}
      }));

      return {
        matches,
        totalCount: matches.length,
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Error searching similar content:', error);
      return {
        matches: [],
        totalCount: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  static async compareResumeToJobDescription(
    env: Env,
    resumeId: string,
    jobDescription: string
  ): Promise<JobMatchResult> {
    try {
      // Generate job description embeddings
      const jobEmbedding = await this.generateTextEmbedding(env, jobDescription);

      // Search for resume sections that match the job description
      const searchResults = await this.searchSimilarContent(env, jobDescription, {
        topK: 20,
        filter: { resumeId }
      });

      // Calculate section-specific scores
      const sectionScores = {
        summary: 0,
        experience: 0,
        skills: 0,
        education: 0
      };

      const sectionCounts = {
        summary: 0,
        experience: 0,
        skills: 0,
        education: 0
      };

      searchResults.matches.forEach(match => {
        const section = match.section as keyof typeof sectionScores;
        if (section in sectionScores) {
          sectionScores[section] += match.score;
          sectionCounts[section]++;
        }
      });

      // Average the scores
      Object.keys(sectionScores).forEach(section => {
        const key = section as keyof typeof sectionScores;
        if (sectionCounts[key] > 0) {
          sectionScores[key] = sectionScores[key] / sectionCounts[key];
        }
      });

      // Calculate overall score
      const overallScore = (
        sectionScores.summary * 0.2 +
        sectionScores.experience * 0.4 +
        sectionScores.skills * 0.3 +
        sectionScores.education * 0.1
      );

      // Extract keywords from job description
      const jobKeywords = await this.extractKeywords(env, jobDescription);
      const resumeKeywords = searchResults.matches.flatMap(match =>
        this.extractKeywordsFromText(match.content)
      );

      const missingKeywords = jobKeywords.filter(keyword =>
        !resumeKeywords.some(resumeKeyword =>
          resumeKeyword.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      const strongMatches = searchResults.matches
        .filter(match => match.score > 0.8)
        .map(match => match.content.substring(0, 100))
        .slice(0, 5);

      const recommendations = this.generateMatchRecommendations(
        overallScore,
        sectionScores,
        missingKeywords,
        strongMatches
      );

      return {
        overallScore: Math.round(overallScore * 100),
        sectionScores: {
          summary: Math.round(sectionScores.summary * 100),
          experience: Math.round(sectionScores.experience * 100),
          skills: Math.round(sectionScores.skills * 100),
          education: Math.round(sectionScores.education * 100)
        },
        missingKeywords: missingKeywords.slice(0, 10),
        strongMatches,
        recommendations
      };

    } catch (error) {
      console.error('Error comparing resume to job description:', error);

      return {
        overallScore: 0,
        sectionScores: { summary: 0, experience: 0, skills: 0, education: 0 },
        missingKeywords: [],
        strongMatches: [],
        recommendations: ['Error occurred during analysis. Please try again.']
      };
    }
  }

  static async findSimilarResumes(
    env: Env,
    resumeId: string,
    limit: number = 5
  ): Promise<SemanticMatch[]> {
    try {
      // Get the resume's embeddings
      const vectorizeIndex = env.RESUME_VECTORIZE_INDEX;
      if (!vectorizeIndex) {
        throw new Error('Vectorize index not configured');
      }

      // Search for similar resumes (excluding the current one)
      const searchResults = await vectorizeIndex.query([], {
        topK: limit + 10, // Get extra to filter out self
        filter: { type: 'resume' },
        includeMetadata: true
      });

      const similarResumes = searchResults.matches
        .filter(match => !match.id.startsWith(resumeId))
        .slice(0, limit)
        .map(match => ({
          id: match.id,
          score: match.score,
          content: match.metadata?.content || '',
          section: match.metadata?.section || 'unknown',
          type: match.metadata?.type || 'resume',
          metadata: match.metadata || {}
        }));

      return similarResumes;

    } catch (error) {
      console.error('Error finding similar resumes:', error);
      return [];
    }
  }

  private static async generateTextEmbedding(env: Env, text: string): Promise<number[]> {
    try {
      // Use Cloudflare AI to generate embeddings
      const response = await env.AI.run('@cf/baai/bge-large-en-v1.5', {
        text: [text]
      });

      return response.data[0] || [];

    } catch (error) {
      console.error('Error generating text embedding:', error);
      // Return a default/empty embedding if generation fails
      return new Array(1024).fill(0); // Adjust size based on your embedding model
    }
  }

  private static async extractKeywords(env: Env, text: string): Promise<string[]> {
    try {
      const prompt = `Extract the top 20 most important keywords and key phrases from this job description.
                     Focus on skills, technologies, qualifications, and role requirements.
                     Return only the keywords/phrases, separated by commas:

                     "${text}"`;

      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are a keyword extraction expert. Return only the requested keywords, separated by commas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const keywords = (response.response || response)
        .split(',')
        .map((keyword: string) => keyword.trim())
        .filter((keyword: string) => keyword.length > 2);

      return keywords.slice(0, 20);

    } catch (error) {
      console.error('Error extracting keywords:', error);
      return this.extractKeywordsFromText(text);
    }
  }

  private static extractKeywordsFromText(text: string): string[] {
    // Simple keyword extraction as fallback
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    return text
      .toLowerCase()
      .split(/[^\w]+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  private static generateMatchRecommendations(
    overallScore: number,
    sectionScores: { summary: number; experience: number; skills: number; education: number },
    missingKeywords: string[],
    strongMatches: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (overallScore < 0.6) {
      recommendations.push('Consider significant resume revisions to better align with this role');
    } else if (overallScore < 0.8) {
      recommendations.push('Resume shows good potential - focus on targeted improvements');
    } else {
      recommendations.push('Strong match! Consider applying with confidence');
    }

    // Section-specific recommendations
    if (sectionScores.skills < 0.7) {
      recommendations.push('Update skills section to include more relevant technologies');
    }

    if (sectionScores.experience < 0.7) {
      recommendations.push('Highlight experience that better aligns with job requirements');
    }

    if (sectionScores.summary < 0.6) {
      recommendations.push('Revise professional summary to better match the role');
    }

    // Keyword recommendations
    if (missingKeywords.length > 5) {
      recommendations.push(`Consider adding these key terms: ${missingKeywords.slice(0, 3).join(', ')}`);
    }

    return recommendations.slice(0, 5);
  }

  static async deleteResumeEmbeddings(env: Env, resumeId: string): Promise<boolean> {
    try {
      const vectorizeIndex = env.RESUME_VECTORIZE_INDEX;
      if (!vectorizeIndex) {
        throw new Error('Vectorize index not configured');
      }

      // Delete all embeddings for this resume
      const embeddings = await vectorizeIndex.query([], {
        topK: 1000,
        filter: { resumeId },
        includeMetadata: false
      });

      const idsToDelete = embeddings.matches.map(match => match.id);

      if (idsToDelete.length > 0) {
        await vectorizeIndex.deleteByIds(idsToDelete);
      }

      return true;

    } catch (error) {
      console.error('Error deleting resume embeddings:', error);
      return false;
    }
  }
}