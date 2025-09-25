import React, { useState } from 'react';

interface APIEndpoint {
  name: string;
  method: string;
  endpoint: string;
  description: string;
  samplePayload?: any;
  requiresFile?: boolean;
}

const API_ENDPOINTS: APIEndpoint[] = [
  {
    name: 'Parse Resume',
    method: 'POST',
    endpoint: '/resume/parse',
    description: 'Extract structured data from resume text',
    samplePayload: {
      resumeText: 'John Doe\nSoftware Engineer\njohn@example.com\n(555) 123-4567\n\nExperience:\nSenior Developer at Tech Corp (2020-2023)\n- Developed web applications using React and Node.js\n- Led a team of 5 developers\n\nSkills: JavaScript, React, Node.js, Python, SQL'
    }
  },
  {
    name: 'Enhanced Analysis',
    method: 'POST',
    endpoint: '/resume/analyze-enhanced',
    description: 'Comprehensive AI-powered resume analysis',
    samplePayload: {
      resumeText: 'John Doe\nSoftware Engineer\njohn@example.com\n(555) 123-4567\n\nExperience:\nSenior Developer at Tech Corp (2020-2023)\n- Developed web applications using React and Node.js\n- Led a team of 5 developers\n\nSkills: JavaScript, React, Node.js, Python, SQL',
      analysisType: 'comprehensive',
      includeEmbeddings: true,
      targetRole: 'Software Engineer',
      targetIndustry: 'Technology'
    }
  },
  {
    name: 'Job Matching',
    method: 'POST',
    endpoint: '/resume/job-match',
    description: 'Match resume against job description',
    samplePayload: {
      resumeText: 'John Doe\nSoftware Engineer\njohn@example.com\n(555) 123-4567\n\nExperience:\nSenior Developer at Tech Corp (2020-2023)\n- Developed web applications using React and Node.js\n- Led a team of 5 developers\n\nSkills: JavaScript, React, Node.js, Python, SQL',
      jobDescription: 'We are looking for a Senior Software Engineer with 3+ years of experience in React, Node.js, and TypeScript. The candidate should have experience with cloud platforms (AWS/Azure) and agile development methodologies. Strong leadership skills are preferred.',
      includeSemanticMatch: true
    }
  },
  {
    name: 'Template Suggestions',
    method: 'POST',
    endpoint: '/resume/templates',
    description: 'Get AI-powered template recommendations',
    samplePayload: {
      resumeText: 'John Doe\nSoftware Engineer\njohn@example.com\n(555) 123-4567\n\nExperience:\nSenior Developer at Tech Corp (2020-2023)\n- Developed web applications using React and Node.js\n- Led a team of 5 developers\n\nSkills: JavaScript, React, Node.js, Python, SQL',
      targetRole: 'Senior Software Engineer',
      targetIndustry: 'Technology',
      experienceLevel: 'Senior',
      generateCustom: true
    }
  },
  {
    name: 'Vector Search',
    method: 'POST',
    endpoint: '/resume/search',
    description: 'Semantic search across resume content',
    samplePayload: {
      query: 'React developer with leadership experience',
      topK: 10,
      searchType: 'similar_content'
    }
  },
  {
    name: 'Process PDF',
    method: 'POST',
    endpoint: '/resume/process-pdf',
    description: 'Extract and process PDF resume',
    requiresFile: true
  },
  {
    name: 'Version Management - Create',
    method: 'POST',
    endpoint: '/resume/versions',
    description: 'Create a new resume version',
    samplePayload: {
      action: 'create',
      resumeId: 'resume-123',
      userId: 'user-456',
      content: 'Updated resume content...',
      changes: ['Added new work experience', 'Updated skills section']
    }
  },
  {
    name: 'Version Management - History',
    method: 'POST',
    endpoint: '/resume/versions',
    description: 'Get version history',
    samplePayload: {
      action: 'history',
      resumeId: 'resume-123'
    }
  },
  {
    name: 'Analytics Tracking',
    method: 'POST',
    endpoint: '/resume/analytics',
    description: 'Track resume usage analytics',
    samplePayload: {
      action: 'analysis',
      resumeId: 'resume-123',
      analysisScore: 85
    }
  },
  {
    name: 'Batch Processing',
    method: 'POST',
    endpoint: '/resume/batch',
    description: 'Process multiple resumes in batch',
    samplePayload: {
      resumes: [
        {
          id: 'resume-1',
          text: 'John Doe\nSoftware Engineer\nExperience with React and Node.js'
        },
        {
          id: 'resume-2',
          text: 'Jane Smith\nData Scientist\nExperience with Python and Machine Learning'
        }
      ],
      operations: ['parse', 'analyze']
    }
  }
];

export default function APITester() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint>(API_ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState(JSON.stringify(API_ENDPOINTS[0].samplePayload, null, 2));
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleEndpointChange = (endpoint: APIEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(endpoint.samplePayload ? JSON.stringify(endpoint.samplePayload, null, 2) : '');
    setResponse('');
    setResponseTime(null);
    setFile(null);
  };

  const handleSendRequest = async () => {
    setLoading(true);
    setResponse('');
    const startTime = Date.now();

    try {
      let requestOptions: RequestInit = {
        method: selectedEndpoint.method,
        headers: {},
      };

      if (selectedEndpoint.requiresFile && file) {
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('extractText', 'true');
        formData.append('optimizeForATS', 'true');
        requestOptions.body = formData;
      } else if (requestBody.trim()) {
        requestOptions.headers = {
          'Content-Type': 'application/json',
        };
        requestOptions.body = requestBody;
      }

      const response = await fetch(selectedEndpoint.endpoint, requestOptions);
      const endTime = Date.now();
      setResponseTime(endTime - startTime);

      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      setResponse(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      }, null, 2));

    } catch (error) {
      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setResponse(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h1 className="text-2xl font-bold text-gray-900">AI Resume API Tester</h1>
          <p className="text-gray-600 mt-1">Test all resume processing endpoints</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-screen">
          {/* Sidebar - Endpoint List */}
          <div className="lg:col-span-1 border-r bg-gray-50">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">API Endpoints</h2>
              <div className="space-y-2">
                {API_ENDPOINTS.map((endpoint, index) => (
                  <button
                    key={index}
                    onClick={() => handleEndpointChange(endpoint)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEndpoint.endpoint === endpoint.endpoint
                        ? 'bg-blue-100 border-blue-300 border-2'
                        : 'bg-white hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${
                        endpoint.method === 'POST' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <span className="font-medium">{endpoint.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{endpoint.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="p-6">
              {/* Endpoint Details */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-mono text-sm">
                    {selectedEndpoint.method}
                  </span>
                  <code className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">
                    {selectedEndpoint.endpoint}
                  </code>
                </div>
                <p className="text-gray-600">{selectedEndpoint.description}</p>
              </div>

              {/* File Upload for PDF endpoints */}
              {selectedEndpoint.requiresFile && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDF File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {file && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

              {/* Request Body */}
              {!selectedEndpoint.requiresFile && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Body (JSON)
                  </label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full h-48 p-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter JSON request body..."
                  />
                </div>
              )}

              {/* Send Request Button */}
              <div className="mb-6">
                <button
                  onClick={handleSendRequest}
                  disabled={loading || (selectedEndpoint.requiresFile && !file)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    'Send Request'
                  )}
                </button>

                {responseTime !== null && (
                  <span className="ml-4 text-sm text-gray-600">
                    Response time: {responseTime}ms
                  </span>
                )}
              </div>

              {/* Response */}
              {response && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Response
                    </label>
                    {response && (
                      <button
                        onClick={() => navigator.clipboard.writeText(response)}
                        className="text-blue-500 hover:text-blue-700 text-sm underline"
                      >
                        Copy Response
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                    <pre className="text-sm whitespace-pre-wrap">{response}</pre>
                  </div>

                  {/* Response Analysis */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Status</div>
                      <div className={`font-mono font-bold ${getStatusColor(JSON.parse(response).status)}`}>
                        {JSON.parse(response).status} {JSON.parse(response).statusText}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Response Time</div>
                      <div className="font-mono font-bold">{responseTime}ms</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Content Type</div>
                      <div className="font-mono text-sm">
                        {JSON.parse(response).headers?.['content-type'] || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {response && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setResponse('');
                        setResponseTime(null);
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Clear Response
                    </button>
                    <button
                      onClick={() => {
                        const formatted = JSON.stringify(JSON.parse(response), null, 2);
                        navigator.clipboard.writeText(formatted);
                      }}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Copy Formatted JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}