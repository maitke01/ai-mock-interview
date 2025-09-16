import { useState } from 'react';
import Login from './components/Login'
import Signup from './components/Signup'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState<'login' | 'signup'>('login');

  return (
    <div>
      {currentPage === 'login' ? (
        <Login onSwitchToSignup={() => setCurrentPage('signup')} />
      ) : (
        <Signup onSwitchToLogin={() => setCurrentPage('login')} />
      )}
    </div>
  )
}

export default App
