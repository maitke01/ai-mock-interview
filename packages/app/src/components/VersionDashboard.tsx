import React, { useState, useCallback, useEffect } from 'react';

interface Version {
  id: string;
  version: number;
  changes: string[];
  createdAt: string;
  createdBy: string;
}

interface VersionComparison {
  oldVersion: Version;
  newVersion: Version;
  differences: Array<{
    section: string;
    changeType: 'added' | 'removed' | 'modified';
    oldValue?: string;
    newValue?: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }>;
  overallImpact: 'positive' | 'negative' | 'neutral';
  scoreChange: number;
}

interface AnalyticsReport {
  overview: {
    totalVersions: number;
    totalAnalyses: number;
    averageScore: number;
    improvementTrend: number;
  };
  versionHistory: Array<{
    version: number;
    date: string;
    score: number;
    changes: number;
    majorChanges: string[];
  }>;
  recommendations: {
    nextSteps: string[];
    focusAreas: string[];
    successMetrics: string[];
  };
}

export default function VersionDashboard() {
  const [resumeId, setResumeId] = useState('resume-123');
  const [versions, setVersions] = useState<Version[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<[string, string]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('versions');

  const fetchVersionHistory = useCallback(async () => {
    if (!resumeId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/resume/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'history',
          resumeId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setVersions(data.versions || []);
      } else {
        throw new Error(data.error || 'Failed to fetch versions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  const compareVersions = useCallback(async () => {
    if (!selectedVersions[0] || !selectedVersions[1]) {
      setError('Please select two versions to compare');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/resume/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'compare',
          versionId: selectedVersions[0],
          compareWithId: selectedVersions[1]
        }),
      });

      if (!response.ok) {
        throw new Error(`Comparison failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setComparison(data.comparison);
        setActiveTab('comparison');
      } else {
        throw new Error(data.error || 'Comparison failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  }, [selectedVersions]);

  const fetchAnalytics = useCallback(async () => {
    if (!resumeId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/resume/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analytics',
          resumeId
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.report);
        setActiveTab('analytics');
      } else {
        throw new Error(data.error || 'Analytics failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics failed');
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  const createNewVersion = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/resume/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          resumeId,
          userId: 'demo-user',
          content: 'Updated resume content with new improvements...',
          changes: [
            'Added quantified achievements in current role',
            'Updated skills section with latest technologies',
            'Improved professional summary',
            'Fixed formatting inconsistencies'
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Version creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchVersionHistory(); // Refresh the list
      } else {
        throw new Error(data.error || 'Version creation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Version creation failed');
    } finally {
      setLoading(false);
    }
  }, [resumeId, fetchVersionHistory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'added': return '➕';
      case 'removed': return '➖';
      case 'modified': return '✏️';
      default: return '🔄';
    }
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Resume Version Dashboard</h1>
          <p className="text-gray-600 mt-1">Track changes and analyze resume evolution</p>
        </div>

        <div className="p-6">
          {/* Resume ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume ID
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter resume ID..."
              />
              <button
                onClick={fetchVersionHistory}
                disabled={loading || !resumeId}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                Load Versions
              </button>
              <button
                onClick={createNewVersion}
                disabled={loading || !resumeId}
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 transition-colors"
              >
                Create Version
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-6">
            <TabButton id="versions" label="Versions" active={activeTab === 'versions'} />
            <TabButton id="comparison" label="Comparison" active={activeTab === 'comparison'} />
            <TabButton id="analytics" label="Analytics" active={activeTab === 'analytics'} />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === 'versions' && !loading && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Version History</h2>
                <button
                  onClick={fetchAnalytics}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  View Analytics
                </button>
              </div>

              {versions.length > 0 ? (
                <div>
                  {/* Version Comparison Selector */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-3">Compare Versions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <select
                        value={selectedVersions[0]}
                        onChange={(e) => setSelectedVersions([e.target.value, selectedVersions[1]])}
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select first version</option>
                        {versions.map(version => (
                          <option key={version.id} value={version.id}>
                            Version {version.version} - {formatDate(version.createdAt)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedVersions[1]}
                        onChange={(e) => setSelectedVersions([selectedVersions[0], e.target.value])}
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select second version</option>
                        {versions.map(version => (
                          <option key={version.id} value={version.id}>
                            Version {version.version} - {formatDate(version.createdAt)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={compareVersions}
                        disabled={!selectedVersions[0] || !selectedVersions[1]}
                        className="bg-orange-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                      >
                        Compare
                      </button>
                    </div>
                  </div>

                  {/* Version List */}
                  <div className="space-y-4">
                    {versions.map(version => (
                      <div key={version.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">Version {version.version}</h3>
                            <p className="text-gray-600">{formatDate(version.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Created by {version.createdBy}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Changes Made:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {version.changes.map((change, index) => (
                              <li key={index} className="text-sm text-gray-700">{change}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No versions found. Load versions for a resume ID to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Comparison Tab */}
          {activeTab === 'comparison' && comparison && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Version Comparison</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold">Version {comparison.oldVersion.version}</h3>
                  <p className="text-sm text-gray-600">{formatDate(comparison.oldVersion.createdAt)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold">Version {comparison.newVersion.version}</h3>
                  <p className="text-sm text-gray-600">{formatDate(comparison.newVersion.createdAt)}</p>
                </div>
              </div>

              {/* Overall Impact */}
              <div className="mb-6 p-4 rounded-lg border-2 border-dashed"
                   style={{
                     borderColor: comparison.overallImpact === 'positive' ? '#10b981' :
                                  comparison.overallImpact === 'negative' ? '#ef4444' : '#6b7280'
                   }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Overall Impact</h3>
                    <p className="text-sm text-gray-600">
                      {comparison.overallImpact === 'positive' ? '✅ Positive changes detected' :
                       comparison.overallImpact === 'negative' ? '⚠️ Some concerning changes' :
                       '🔄 Neutral changes'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {comparison.scoreChange > 0 ? '+' : ''}{comparison.scoreChange}
                    </div>
                    <p className="text-sm text-gray-600">Score Change</p>
                  </div>
                </div>
              </div>

              {/* Differences */}
              <div>
                <h3 className="font-semibold mb-4">Changes Detected</h3>
                <div className="space-y-3">
                  {comparison.differences.map((diff, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">{getChangeTypeIcon(diff.changeType)}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{diff.section}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(diff.impact)}`}>
                              {diff.impact} impact
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2">{diff.description}</p>

                          {diff.oldValue && diff.newValue && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-red-600 mb-1">Before:</p>
                                <div className="bg-red-50 p-2 rounded border">
                                  {diff.oldValue.substring(0, 100)}
                                  {diff.oldValue.length > 100 && '...'}
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-green-600 mb-1">After:</p>
                                <div className="bg-green-50 p-2 rounded border">
                                  {diff.newValue.substring(0, 100)}
                                  {diff.newValue.length > 100 && '...'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Analytics Report</h2>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.overview.totalVersions}</div>
                  <p className="text-blue-800 font-medium">Total Versions</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.overview.totalAnalyses}</div>
                  <p className="text-green-800 font-medium">Analyses Run</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analytics.overview.averageScore}</div>
                  <p className="text-purple-800 font-medium">Average Score</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{analytics.overview.improvementTrend}%</div>
                  <p className="text-orange-800 font-medium">Improvement</p>
                </div>
              </div>

              {/* Version History Chart */}
              <div className="mb-8">
                <h3 className="font-semibold mb-4">Score Evolution</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    {analytics.versionHistory.map((version, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-16 text-sm font-medium">v{version.version}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${version.score}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm font-bold">{version.score}</div>
                        <div className="text-sm text-gray-600">{version.changes} changes</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3">Next Steps</h4>
                  <ul className="space-y-2">
                    {analytics.recommendations.nextSteps.map((step, index) => (
                      <li key={index} className="text-sm text-blue-700 flex items-start space-x-2">
                        <span>•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-3">Focus Areas</h4>
                  <ul className="space-y-2">
                    {analytics.recommendations.focusAreas.map((area, index) => (
                      <li key={index} className="text-sm text-green-700 flex items-start space-x-2">
                        <span>•</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-3">Success Metrics</h4>
                  <ul className="space-y-2">
                    {analytics.recommendations.successMetrics.map((metric, index) => (
                      <li key={index} className="text-sm text-purple-700 flex items-start space-x-2">
                        <span>•</span>
                        <span>{metric}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}