import React, { useState, useCallback, useRef } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface ResumeAnalysisResult {
  overallScore: number;
  atsCompatibility: number;
  contentAnalysis: {
    hasContactInfo: boolean;
    hasWorkExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    wordCount: number;
    sections: string[];
  };
  recommendations: string[];
  gaps: string[];
  keywords: string[];
  improvements: string[];
}

interface JobMatchResult {
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  salaryRange?: { min: number; max: number };
}

interface VectorAnalysis {
  semanticScore: number;
  contentRelevance: number;
  keywordDensity: number;
  recommendations: string[];
}

export default function ComprehensiveResumeAnalyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [jobMatchResult, setJobMatchResult] = useState<JobMatchResult | null>(null);
  const [vectorAnalysis, setVectorAnalysis] = useState<VectorAnalysis | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setLoadingState = (key: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setError('');
      setExtractedText('');
      setAnalysisResult(null);
      setJobMatchResult(null);
      setVectorAnalysis(null);

      // Auto-extract text when file is selected
      await extractPDFText(file);
    }
  }, []);

  const extractPDFText = async (file: File) => {
    setLoadingState('pdf', true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      const loadingTask = getDocument({
        data: typedArray,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const textItems = textContent.items;
        const pageText = textItems
          .filter((item: any) => item.str && item.str.trim())
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        fullText += pageText + '\n\n';
      }

      setExtractedText(fullText.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF extraction failed');
    } finally {
      setLoadingState('pdf', false);
    }
  };

  const analyzeResume = async () => {
    if (!extractedText) {
      setError('Please extract text from a PDF first');
      return;
    }

    setLoadingState('analysis', true);
    try {
      const response = await fetch('/resume/analyze-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: extractedText,
          analysisType: 'comprehensive'
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();

      // Convert backend scores (out of 10) to percentage (out of 100)
      const normalizedResult = {
        ...data.analysis,
        overallScore: Math.round((data.analysis?.score || 0) * 10), // Backend returns score field, not overallScore
        atsCompatibility: Math.round((data.analysis?.feedback?.atsCompatibility?.score || 0) * 10),
        contentAnalysis: data.analysis?.feedback?.contentAnalysis,
        recommendations: data.analysis?.suggestions || [],
        gaps: data.analysis?.feedback?.weaknesses || [],
        keywords: data.analysis?.missingKeywords || [],
        improvements: data.analysis?.suggestions || []
      };

      setAnalysisResult(normalizedResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoadingState('analysis', false);
    }
  };

  const matchJob = async () => {
    if (!extractedText || !jobDescription.trim()) {
      setError('Please provide both resume text and job description');
      return;
    }

    setLoadingState('jobMatch', true);
    try {
      const response = await fetch('/resume/job-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: extractedText,
          jobDescription: jobDescription.trim()
        }),
      });

      if (!response.ok) throw new Error('Job matching failed');

      const data = await response.json();
      setJobMatchResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Job matching failed');
    } finally {
      setLoadingState('jobMatch', false);
    }
  };

  const runVectorAnalysis = async () => {
    if (!extractedText) {
      setError('Please extract text from a PDF first');
      return;
    }

    setLoadingState('vector', true);
    try {
      const response = await fetch('/resume/analyze-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: extractedText,
          includeEmbeddings: true,
          analysisType: 'vector'
        }),
      });

      if (!response.ok) throw new Error('Vector analysis failed');

      const data = await response.json();

      // Transform the response to match expected vector analysis format
      const vectorData = {
        semanticScore: data.analysis?.overallScore || 0,
        contentRelevance: data.analysis?.atsCompatibility || 0,
        keywordDensity: Math.min(100, (data.analysis?.improvements?.length || 0) * 20),
        recommendations: data.analysis?.improvements || data.analysis?.recommendations || []
      };

      setVectorAnalysis(vectorData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vector analysis failed');
    } finally {
      setLoadingState('vector', false);
    }
  };

  const runAllAnalysis = async () => {
    if (!extractedText) {
      setError('Please extract text from a PDF first');
      return;
    }

    await Promise.all([
      analyzeResume(),
      runVectorAnalysis(),
      jobDescription.trim() ? matchJob() : Promise.resolve()
    ]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-2">AI Resume Analyzer</h1>
        <p className="text-gray-600 mb-8">
          Upload your PDF resume for comprehensive AI analysis, job matching, and optimization recommendations.
        </p>

        {/* File Upload Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Upload PDF Resume</h2>
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-6">
            {selectedFile ? (
              <div className="text-center space-y-3">
                <div className="text-4xl">📄</div>
                <p className="text-lg font-semibold text-gray-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setExtractedText('');
                    setAnalysisResult(null);
                    setJobMatchResult(null);
                    setVectorAnalysis(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-500 hover:text-red-700 underline text-sm"
                >
                  Remove file
                </button>
                {loading.pdf && (
                  <div className="flex items-center justify-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Extracting text...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-6xl text-blue-400">📎</div>
                <div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Select your PDF resume
                  </p>
                  <p className="text-sm text-gray-500 mb-4">Maximum file size: 5MB</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Extracted Text Preview */}
        {extractedText && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Extracted Text Preview</h2>
            <div className="bg-gray-50 border rounded-lg p-4 max-h-48 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap text-gray-700">
                {extractedText}
              </pre>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {extractedText.length} characters extracted
            </p>
          </div>
        )}

        {/* Job Description Input */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Job Description (Optional)</h2>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here for targeted matching analysis..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={analyzeResume}
            disabled={!extractedText || loading.analysis}
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading.analysis && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>Analyze Resume</span>
          </button>

          <button
            onClick={matchJob}
            disabled={!extractedText || !jobDescription.trim() || loading.jobMatch}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading.jobMatch && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>Match Job</span>
          </button>

          <button
            onClick={runVectorAnalysis}
            disabled={!extractedText || loading.vector}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading.vector && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>Vector Analysis</span>
          </button>

          <button
            onClick={runAllAnalysis}
            disabled={!extractedText || Object.values(loading).some(Boolean)}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <span>🚀 Run Full Analysis</span>
          </button>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Resume Analysis Results */}
          {analysisResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🧠</span>
                AI Resume Analysis
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Overall Score</span>
                    <span className="text-2xl font-bold text-green-600">
                      {analysisResult.overallScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${analysisResult.overallScore}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">ATS Compatibility</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {analysisResult.atsCompatibility}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${analysisResult.atsCompatibility}%` }}
                    ></div>
                  </div>
                </div>

                {analysisResult.contentAnalysis && (
                  <div>
                    <h4 className="font-medium mb-2">Content Analysis</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <span className={analysisResult.contentAnalysis.hasContactInfo ? 'text-green-600' : 'text-red-600'}>
                          {analysisResult.contentAnalysis.hasContactInfo ? '✅' : '❌'}
                        </span>
                        <span className="ml-2">Contact Info</span>
                      </div>
                      <div className="flex items-center">
                        <span className={analysisResult.contentAnalysis.hasWorkExperience ? 'text-green-600' : 'text-red-600'}>
                          {analysisResult.contentAnalysis.hasWorkExperience ? '✅' : '❌'}
                        </span>
                        <span className="ml-2">Work Experience</span>
                      </div>
                      <div className="flex items-center">
                        <span className={analysisResult.contentAnalysis.hasEducation ? 'text-green-600' : 'text-red-600'}>
                          {analysisResult.contentAnalysis.hasEducation ? '✅' : '❌'}
                        </span>
                        <span className="ml-2">Education</span>
                      </div>
                      <div className="flex items-center">
                        <span className={analysisResult.contentAnalysis.hasSkills ? 'text-green-600' : 'text-red-600'}>
                          {analysisResult.contentAnalysis.hasSkills ? '✅' : '❌'}
                        </span>
                        <span className="ml-2">Skills</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Word Count: {analysisResult.contentAnalysis.wordCount || 0}
                    </p>
                  </div>
                )}

                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {analysisResult.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Job Match Results */}
          {jobMatchResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🎯</span>
                Job Match Analysis
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Match Score</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {jobMatchResult.matchScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${jobMatchResult.matchScore}%` }}
                    ></div>
                  </div>
                </div>

                {jobMatchResult.matchedKeywords && jobMatchResult.matchedKeywords.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">
                      Matched Keywords ({jobMatchResult.matchedKeywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {jobMatchResult.matchedKeywords.slice(0, 8).map((keyword, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                      {jobMatchResult.matchedKeywords.length > 8 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{jobMatchResult.matchedKeywords.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {jobMatchResult.missingKeywords && jobMatchResult.missingKeywords.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">
                      Missing Keywords ({jobMatchResult.missingKeywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {jobMatchResult.missingKeywords.slice(0, 6).map((keyword, index) => (
                        <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                      {jobMatchResult.missingKeywords.length > 6 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{jobMatchResult.missingKeywords.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {jobMatchResult.recommendations && jobMatchResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Job Match Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {jobMatchResult.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vector Analysis Results */}
          {vectorAnalysis && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🔍</span>
                Vector Analysis
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Semantic Score</span>
                    <span className="text-lg font-semibold text-purple-600">
                      {vectorAnalysis.semanticScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${vectorAnalysis.semanticScore}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Content Relevance</span>
                    <span className="text-lg font-semibold text-indigo-600">
                      {vectorAnalysis.contentRelevance}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${vectorAnalysis.contentRelevance}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Keyword Density</span>
                    <span className="text-lg font-semibold text-pink-600">
                      {vectorAnalysis.keywordDensity}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${vectorAnalysis.keywordDensity}%` }}
                    ></div>
                  </div>
                </div>

                {vectorAnalysis.recommendations && vectorAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Vector Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {vectorAnalysis.recommendations.slice(0, 4).map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-purple-500 mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {extractedText && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(extractedText)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Copy Extracted Text
              </button>
              <button
                onClick={() => {
                  const results = {
                    analysis: analysisResult,
                    jobMatch: jobMatchResult,
                    vectorAnalysis: vectorAnalysis
                  };
                  navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                }}
                disabled={!analysisResult && !jobMatchResult && !vectorAnalysis}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Copy All Results
              </button>
              <button
                onClick={() => window.print()}
                disabled={!analysisResult && !jobMatchResult && !vectorAnalysis}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Print Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}