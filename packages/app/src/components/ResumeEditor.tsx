import React, { useState, useCallback } from 'react';

interface AnalysisResult {
  score: number;
  feedback: {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    atsCompatibility: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    contentAnalysis: {
      clarity: number;
      impact: number;
      relevance: number;
    };
  };
  suggestions: string[];
  missingKeywords: string[];
}

interface JobMatch {
  matchScore: number;
  keywordMatches: Array<{
    keyword: string;
    importance: string;
    category: string;
  }>;
  missingKeywords: string[];
  suggestions: string[];
}

interface TemplateData {
  template: {
    id: string;
    name: string;
    description: string;
  };
  matchScore: number;
  reasoning: string[];
}

export default function ResumeEditor() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [analysisType, setAnalysisType] = useState('comprehensive');

  // Listen for resume text loading from PDF upload
  React.useEffect(() => {
    const handleLoadResumeText = (event: CustomEvent) => {
      if (event.detail) {
        setResumeText(event.detail);
        setActiveTab('editor');
      }
    };

    window.addEventListener('loadResumeText', handleLoadResumeText as EventListener);
    return () => {
      window.removeEventListener('loadResumeText', handleLoadResumeText as EventListener);
    };
  }, []);

  // Results state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [jobMatch, setJobMatch] = useState<JobMatch | null>(null);
  const [templates, setTemplates] = useState<TemplateData[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [error, setError] = useState('');

  const handleAnalyzeResume = useCallback(async () => {
    if (!resumeText.trim()) {
      setError('Please enter resume text first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/resume/analyze-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          analysisType,
          includeEmbeddings: true,
          jobDescription: jobDescription || undefined,
          targetRole: targetRole || undefined,
          targetIndustry: targetIndustry || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
        if (data.jobMatch) setJobMatch(data.jobMatch);
        if (data.templateSuggestions) setTemplates(data.templateSuggestions);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [resumeText, analysisType, jobDescription, targetRole, targetIndustry]);

  const handleJobMatch = useCallback(async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please enter both resume text and job description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/resume/job-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          includeSemanticMatch: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Job matching failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setJobMatch(data.jobMatch);
      } else {
        throw new Error(data.error || 'Job matching failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Job matching failed');
    } finally {
      setLoading(false);
    }
  }, [resumeText, jobDescription]);

  const handleGetTemplates = useCallback(async () => {
    if (!resumeText.trim()) {
      setError('Please enter resume text first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/resume/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          targetRole: targetRole || undefined,
          targetIndustry: targetIndustry || undefined,
          generateCustom: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Template generation failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setTemplates(data.suggestions || []);
      } else {
        throw new Error(data.error || 'Template generation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template generation failed');
    } finally {
      setLoading(false);
    }
  }, [resumeText, targetRole, targetIndustry]);

  const ScoreBar = ({ label, score, maxScore = 100 }: { label: string; score: number; maxScore?: number }) => {
    const percentage = (score / maxScore) * 100;
    const getColor = () => {
      if (percentage >= 80) return 'bg-green-500';
      if (percentage >= 60) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-600">{score}/{maxScore}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const TabButton = ({ id, label, active }: { id: string; label: string; active: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 font-medium rounded-lg transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Resume Editor</h1>
          <p className="text-xl text-gray-600">Optimize your resume with AI-powered analysis</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center space-x-2 mb-8">
          <TabButton id="editor" label="Editor" active={activeTab === 'editor'} />
          <TabButton id="analysis" label="Analysis" active={activeTab === 'analysis'} />
          <TabButton id="jobmatch" label="Job Match" active={activeTab === 'jobmatch'} />
          <TabButton id="templates" label="Templates" active={activeTab === 'templates'} />
          <TabButton id="pdf" label="PDF Upload" active={activeTab === 'pdf'} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {activeTab === 'editor' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Resume Editor</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resume Text
                    </label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Paste your resume text here..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Role
                      </label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={targetIndustry}
                        onChange={(e) => setTargetIndustry(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Technology"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Analysis Type
                    </label>
                    <select
                      value={analysisType}
                      onChange={(e) => setAnalysisType(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="comprehensive">Comprehensive Analysis</option>
                      <option value="ats-optimization">ATS Optimization</option>
                      <option value="gap-detection">Gap Detection</option>
                      <option value="industry-specific">Industry Specific</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAnalyzeResume}
                    disabled={loading || !resumeText.trim()}
                    className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Analyzing...' : 'Analyze Resume'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'jobmatch' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Job Matching</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Description
                    </label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Paste the job description here..."
                    />
                  </div>

                  <button
                    onClick={handleJobMatch}
                    disabled={loading || !resumeText.trim() || !jobDescription.trim()}
                    className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Matching...' : 'Match with Job'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Template Suggestions</h2>

                <button
                  onClick={handleGetTemplates}
                  disabled={loading || !resumeText.trim()}
                  className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Generating...' : 'Get Template Suggestions'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Analysis Results */}
            {activeTab === 'analysis' && analysis && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">Analysis Results</h3>

                <div className="space-y-4">
                  <ScoreBar label="Overall Score" score={analysis.score} />
                  <ScoreBar label="ATS Compatibility" score={analysis.feedback.atsCompatibility.score} />
                  <ScoreBar label="Content Clarity" score={analysis.feedback.contentAnalysis.clarity} maxScore={10} />
                  <ScoreBar label="Content Impact" score={analysis.feedback.contentAnalysis.impact} maxScore={10} />

                  <div className="mt-6">
                    <h4 className="font-semibold text-green-600 mb-2">Strengths:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.feedback.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-gray-700">{strength}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-red-600 mb-2">Areas for Improvement:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.feedback.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-sm text-gray-700">{weakness}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-700">{suggestion}</li>
                      ))}
                    </ul>
                  </div>

                  {analysis.missingKeywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-orange-600 mb-2">Missing Keywords:</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.missingKeywords.map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Job Match Results */}
            {activeTab === 'jobmatch' && jobMatch && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">Job Match Results</h3>

                <div className="space-y-4">
                  <ScoreBar label="Match Score" score={jobMatch.matchScore} />

                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Matched Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {jobMatch.keywordMatches
                        .filter(match => match.importance === 'high')
                        .map((match, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                            {match.keyword} ({match.category})
                          </span>
                        ))}
                    </div>
                  </div>

                  {jobMatch.missingKeywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">Missing Keywords:</h4>
                      <div className="flex flex-wrap gap-2">
                        {jobMatch.missingKeywords.map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">Improvement Suggestions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {jobMatch.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-700">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Template Results */}
            {activeTab === 'templates' && templates.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">Template Suggestions</h3>

                <div className="space-y-4">
                  {templates.map((template, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-lg">{template.template.name}</h4>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {template.matchScore}% match
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{template.template.description}</p>

                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Why this template:</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {template.reasoning.map((reason, reasonIndex) => (
                            <li key={reasonIndex} className="text-sm text-gray-600">{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing your request...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}