import type { Route } from "../..";
import { ResumeParserService } from "../services/resumeParser";
import { ResumeAnalysisService } from "../services/resumeAnalysisService";
import { PDFProcessingService } from "../services/pdfProcessingService";
import { VectorEmbeddingService } from "../services/vectorEmbeddingService";
import { JobMatchingService } from "../services/jobMatchingService";
import { TemplateService } from "../services/templateService";
import { VersionTrackingService } from "../services/versionTrackingService";

// Enhanced Resume Analysis Route
export const enhancedResumeAnalysisRoute: Route = async (ctx) => {
  try {
    const {
      resumeText,
      analysisType = 'comprehensive',
      includeEmbeddings = false,
      jobDescription,
      targetRole,
      targetIndustry
    } = await ctx.req.json();

    if (!resumeText) {
      return Response.json({ error: 'Resume text is required' }, { status: 400 });
    }

    // Parse the resume
    const parsedResume = await ResumeParserService.parseResumeText(resumeText);

    // Perform AI analysis
    const analysis = await ResumeAnalysisService.analyzeResume(
      ctx.env,
      resumeText,
      parsedResume.sections,
      analysisType
    );

    let jobMatch = null;
    if (jobDescription) {

    }

    let templateSuggestions = null;
    if (targetRole || targetIndustry) {

    }

    let embeddings = null;
    if (includeEmbeddings) {

    }

    return Response.json({
      success: true,
      analysis,
      parsedResume,
      jobMatch,
      templateSuggestions: templateSuggestions?.slice(0, 3),
      embeddings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhanced resume analysis error:', error);
    return Response.json({
      error: 'Failed to analyze resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// PDF Processing Route
export const pdfProcessingRoute: Route = async (ctx) => {
  try {
    const formData = await ctx.req.formData();
    const pdfFile = formData.get('pdf') as File;
    const extractText = formData.get('extractText') === 'true';
    const optimizeForATS = formData.get('optimizeForATS') === 'true';

    if (!pdfFile) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const pdfBuffer = await pdfFile.arrayBuffer();

    // Process PDF
    const result = await PDFProcessingService.processPDFFromFile(pdfBuffer, {
      extractText,
      extractMetadata: true,
      preserveFormatting: !optimizeForATS
    });

    if (!result.success) {
      return Response.json({
        error: 'PDF processing failed',
        details: result.error
      }, { status: 400 });
    }

    // If optimization requested, optimize for ATS
    let optimizedResult = null;
    if (optimizeForATS) {
      optimizedResult = await PDFProcessingService.optimizePDFForATS(pdfBuffer, {
        removeImages: true,
        simplifyFormatting: true,
        standardizeFonts: true,
        ensureTextSelectable: true
      });
    }

    // Extract structured resume data if text was extracted
    let parsedResume = null;
    if (extractText && result.text) {
      parsedResume = ResumeParserService.parseResumeText(result.text);
    }

    return Response.json({
      success: true,
      pdfData: {
        text: result.text,
        metadata: result.metadata,
        pageCount: result.pages.length
      },
      optimization: optimizedResult,
      parsedResume,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    return Response.json({
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Job Matching Route
export const jobMatchingRoute: Route = async (ctx) => {
  try {
    const { resumeText, jobDescription, includeSemanticMatch = true } = await ctx.req.json();

    if (!resumeText || !jobDescription) {
      return Response.json({
        error: 'Both resume text and job description are required'
      }, { status: 400 });
    }

    const parsedResume = ResumeParserService.parseResumeText(resumeText);

    // Perform detailed job matching
    const jobMatch = await JobMatchingService.performDetailedJobMatch(
      ctx.env,
      parsedResume.sections,
      jobDescription
    );

    let semanticMatch = null;
    if (includeSemanticMatch) {
      // Generate embeddings and compare semantically
      await VectorEmbeddingService.generateResumeEmbeddings(
        ctx.env,
        'temp-id',
        parsedResume.sections
      );

      semanticMatch = await VectorEmbeddingService.compareResumeToJobDescription(
        ctx.env,
        'temp-id',
        jobDescription
      );
    }

    // Generate improvement suggestions
    const prompt = `Based on this job match analysis, provide specific improvement suggestions:

    Match Score: ${jobMatch.matchScore}%
    Missing Keywords: ${jobMatch.missingKeywords.join(', ')}

    Provide 5-7 actionable recommendations to improve the match score.`;

    const aiSuggestions = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a career coach. Provide specific, actionable advice for resume improvement.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = typeof (aiSuggestions.response || aiSuggestions) === 'string'
      ? (aiSuggestions.response || aiSuggestions)
      : JSON.stringify(aiSuggestions.response || aiSuggestions);

    const suggestions = responseText
      .split('\n')
      .filter((line: string) => line.trim() && line.match(/^[-*•\d+\.]/))
      .map((line: string) => line.replace(/^[-*•\d+\.]\s*/, '').trim())
      .slice(0, 7);

    return Response.json({
      success: true,
      jobMatch,
      semanticMatch,
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Job matching error:', error);
    return Response.json({
      error: 'Failed to perform job matching',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Template Suggestions Route
export const templateSuggestionsRoute: Route = async (ctx) => {
  try {
    const {
      resumeText,
      targetRole,
      targetIndustry,
      experienceLevel,
      generateCustom = false
    } = await ctx.req.json();

    if (!resumeText) {
      return Response.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const parsedResume = ResumeParserService.parseResumeText(resumeText);

    // Get template suggestions
    const suggestions = await TemplateService.suggestTemplates(
      ctx.env,
      parsedResume.sections,
      targetRole,
      targetIndustry
    );

    let customTemplate = null;
    if (generateCustom && targetRole && targetIndustry) {
      customTemplate = await TemplateService.generateCustomTemplate(
        ctx.env,
        parsedResume.sections,
        {
          role: targetRole,
          industry: targetIndustry,
          experienceLevel: experienceLevel || 'Mid'
        }
      );
    }

    // Optimize suggested templates for ATS
    const optimizedSuggestions = await Promise.all(
      suggestions.slice(0, 3).map(async (suggestion) => {
        const optimized = await TemplateService.optimizeTemplateForATS(suggestion.template);
        return {
          ...suggestion,
          atsOptimization: optimized
        };
      })
    );

    return Response.json({
      success: true,
      suggestions: optimizedSuggestions,
      customTemplate,
      count: suggestions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Template suggestions error:', error);
    return Response.json({
      error: 'Failed to generate template suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Version Management Route
export const versionManagementRoute: Route = async (ctx) => {
  try {
    const { action, resumeId, userId, content, changes, versionId, compareWithId } = await ctx.req.json();

    switch (action) {
      case 'create':
        if (!resumeId || !userId || !content || !changes) {
          return Response.json({ error: 'Missing required fields for version creation' }, { status: 400 });
        }

        const parsedContent = ResumeParserService.parseResumeText(content);
        const newVersion = await VersionTrackingService.createNewVersion(
          resumeId,
          content,
          parsedContent,
          changes,
          userId
        );

        return Response.json({
          success: true,
          version: newVersion
        });

      case 'history':
        if (!resumeId) {
          return Response.json({ error: 'Resume ID is required' }, { status: 400 });
        }

        const history = await VersionTrackingService.getVersionHistory(resumeId);
        return Response.json({
          success: true,
          versions: history
        });

      case 'compare':
        if (!versionId || !compareWithId) {
          return Response.json({ error: 'Two version IDs are required for comparison' }, { status: 400 });
        }

        const comparison = await VersionTrackingService.compareVersions(versionId, compareWithId);
        return Response.json({
          success: true,
          comparison
        });

      case 'analytics':
        if (!resumeId) {
          return Response.json({ error: 'Resume ID is required' }, { status: 400 });
        }

        const report = await VersionTrackingService.generateAnalyticsReport(resumeId);
        return Response.json({
          success: true,
          report
        });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Version management error:', error);
    return Response.json({
      error: 'Version management failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Vector Search Route
export const vectorSearchRoute: Route = async (ctx) => {
  try {
    const { query, resumeId, topK = 10, searchType = 'similar_content' } = await ctx.req.json();

    if (!query) {
      return Response.json({ error: 'Search query is required' }, { status: 400 });
    }

    let searchResults;

    switch (searchType) {
      case 'similar_content':
        searchResults = await VectorEmbeddingService.searchSimilarContent(
          ctx.env,
          query,
          { topK, includeMetadata: true }
        );
        break;

      case 'job_match':
        if (!resumeId) {
          return Response.json({ error: 'Resume ID is required for job matching' }, { status: 400 });
        }

        const jobMatchResult = await VectorEmbeddingService.compareResumeToJobDescription(
          ctx.env,
          resumeId,
          query
        );

        return Response.json({
          success: true,
          jobMatch: jobMatchResult,
          timestamp: new Date().toISOString()
        });

      case 'similar_resumes':
        if (!resumeId) {
          return Response.json({ error: 'Resume ID is required for similar resume search' }, { status: 400 });
        }

        const similarResumes = await VectorEmbeddingService.findSimilarResumes(
          ctx.env,
          resumeId,
          topK
        );

        return Response.json({
          success: true,
          similarResumes,
          timestamp: new Date().toISOString()
        });

      default:
        return Response.json({ error: 'Invalid search type' }, { status: 400 });
    }

    return Response.json({
      success: true,
      results: searchResults,
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Vector search error:', error);
    return Response.json({
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Analytics Tracking Route
export const analyticsTrackingRoute: Route = async (ctx) => {
  try {
    const { action, resumeId, analysisScore } = await ctx.req.json();

    if (!resumeId) {
      return Response.json({ error: 'Resume ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'view':
        await VersionTrackingService.trackResumeView(resumeId);
        break;

      case 'download':
        await VersionTrackingService.trackResumeDownload(resumeId);
        break;

      case 'analysis':
        if (typeof analysisScore !== 'number') {
          return Response.json({ error: 'Analysis score is required for analysis tracking' }, { status: 400 });
        }
        await VersionTrackingService.trackAnalysisRun(resumeId, analysisScore);
        break;

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({
      success: true,
      action,
      resumeId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return Response.json({
      error: 'Analytics tracking failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Batch Processing Route
export const batchProcessingRoute: Route = async (ctx) => {
  try {
    const { resumes, operations = ['analyze', 'parse'] } = await ctx.req.json();

    if (!resumes || !Array.isArray(resumes)) {
      return Response.json({ error: 'Resumes array is required' }, { status: 400 });
    }

    const results = [];

    for (const resume of resumes.slice(0, 10)) { // Limit to 10 resumes per batch
      try {
        const result: any = {
          id: resume.id || crypto.randomUUID(),
          originalText: resume.text
        };

        if (operations.includes('parse')) {
          result.parsed = ResumeParserService.parseResumeText(resume.text);
        }

        if (operations.includes('analyze')) {
          result.analysis = await ResumeAnalysisService.analyzeResume(
            ctx.env,
            resume.text,
            result.parsed || ResumeParserService.parseResumeText(resume.text),
            'comprehensive'
          );
        }

        if (operations.includes('embeddings')) {
          const parsedContent = result.parsed || ResumeParserService.parseResumeText(resume.text);
          const embeddings = await VectorEmbeddingService.generateResumeEmbeddings(
            ctx.env,
            result.id,
            parsedContent.sections
          );
          // await VectorEmbeddingService.storeEmbeddings(ctx.env, embeddings);
          result.embeddings = { count: embeddings.length, stored: true };
        }

        if (operations.includes('job_match') && resume.jobDescription) {
          const parsedContent = result.parsed || ResumeParserService.parseResumeText(resume.text);
          result.jobMatch = await JobMatchingService.performDetailedJobMatch(
            ctx.env,
            parsedContent.sections,
            resume.jobDescription
          );
        }

        results.push(result);

      } catch (error) {
        results.push({
          id: resume.id || 'unknown',
          error: error instanceof Error ? error.message : 'Processing failed',
          success: false
        });
      }
    }

    return Response.json({
      success: true,
      results,
      processed: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    return Response.json({
      error: 'Batch processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};