import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import ResumeBuilder from './components/ResumeBuilder'
import Signup from './components/Signup'
import MockInterview from "./components/MockInterview";

function App () {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/resume' element={<ResumeBuilder />} />
        <Route path="/interview" element={<MockInterview />} />
        {/* ...existing code... */}
      </Routes>
    </Router>
  )
}

export default App
