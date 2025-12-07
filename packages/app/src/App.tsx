import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ResumeBuilder from './components/ResumeBuilder';
import JobSearch from './components/JobSearch';
import MockInterview from './components/MockInterview';
import MyResumes from './components/MyResumes';
import ScheduleInterview from './components/ScheduleInterview';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/job-search" element={<JobSearch />} />
        <Route path="/mock-interview" element={<MockInterview />} />
        <Route path="/my-resumes" element={<MyResumes />} />
        <Route path="/schedule-interview" element={<ScheduleInterview />} />
      </Routes>
    </Router>
  );
};

export default App;
