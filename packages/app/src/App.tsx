import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import ResumeBuilder from "./components/ResumeBuilder";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ResumeEditor from "./components/ResumeEditor";
import WorkingPDFUploader from "./components/WorkingPDFUploader";
import APITester from "./components/APITester";
import VersionDashboard from "./components/VersionDashboard";
import ComprehensiveResumeAnalyzer from "./components/ComprehensiveResumeAnalyzer";

function Navigation() {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">AI Resume Editor</Link>
            <div className="hidden md:flex space-x-6">
              <Link to="/analyzer" className="hover:text-blue-200 transition-colors">Complete Analyzer</Link>
              <Link to="/dashboard" className="hover:text-blue-200 transition-colors">Dashboard</Link>
              <Link to="/resume-editor" className="hover:text-blue-200 transition-colors">AI Editor</Link>
              <Link to="/pdf-upload" className="hover:text-blue-200 transition-colors">PDF Upload</Link>
              <Link to="/versions" className="hover:text-blue-200 transition-colors">Versions</Link>
              <Link to="/api-test" className="hover:text-blue-200 transition-colors">API Test</Link>
            </div>
          </div>
          <div className="flex space-x-4">
            <Link to="/login" className="hover:text-blue-200 transition-colors">Login</Link>
            <Link to="/signup" className="hover:text-blue-200 transition-colors">Signup</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">AI Resume Editor</h1>
          <p className="text-xl text-gray-600 mb-12">
            Optimize your resume with advanced AI analysis, job matching, and ATS compatibility
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
              <p className="text-gray-600 text-sm">Comprehensive NLP-powered resume optimization</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold mb-2">Job Matching</h3>
              <p className="text-gray-600 text-sm">Smart matching against job descriptions</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-semibold mb-2">PDF Processing</h3>
              <p className="text-gray-600 text-sm">Direct PDF editing and ATS optimization</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">Version Tracking</h3>
              <p className="text-gray-600 text-sm">Analytics and improvement tracking</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center space-x-4">
              <Link
                to="/analyzer"
                className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                Start Analysis
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Features Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-3">AI-Powered Analysis</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Comprehensive resume scoring</li>
                <li>• Gap detection and recommendations</li>
                <li>• ATS compatibility analysis</li>
                <li>• Industry-specific optimization</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3">Advanced Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Vector embedding analysis</li>
                <li>• Semantic job matching</li>
                <li>• Template suggestions</li>
                <li>• Version control & analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*" element={
            <>
              <Navigation />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/analyzer" element={<ComprehensiveResumeAnalyzer />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/resume" element={<ResumeBuilder />} />
                <Route path="/resume-editor" element={<ResumeEditor />} />
                <Route path="/pdf-upload" element={<WorkingPDFUploader />} />
                <Route path="/versions" element={<VersionDashboard />} />
                <Route path="/api-test" element={<APITester />} />
              </Routes>
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
