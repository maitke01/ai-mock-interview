import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'AI Resume & Interview Trainer' }) => {
  const navigate = useNavigate();

  return (
    <div className='bg-blue-600 dark:bg-blue-800 shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center py-4'>
          <div className="flex-1 min-w-0">
            <h1 className='text-2xl font-bold text-white'>{title}</h1>
          </div>
          <nav className='flex items-center space-x-4 flex-shrink-0 ml-4'>
            <a href='#' className='text-white font-medium hover:text-blue-200 transition-colors' style={{ color: 'white' }} onClick={() => navigate('/dashboard')}>
              Dashboard
            </a>
            <a href='#' className='text-white font-medium hover:text-blue-200 transition-colors' style={{ color: 'white' }} onClick={() => navigate('/resume')}>
              Resume Builder
            </a>
            <a href='#' className='text-white font-medium hover:text-blue-200 transition-colors' style={{ color: 'white' }} onClick={() => navigate('/job-search')}>
              Job Search
            </a>
            <a href='#' className='text-white font-medium hover:text-blue-200 transition-colors' style={{ color: 'white' }} onClick={() => navigate('/interview')}>
              Mock Interview
            </a>
            <button
              onClick={() => navigate('/login')}
              className='bg-red-500 text-black font-semibold hover:bg-red-600 py-2 px-4 rounded-lg shadow-md transition-colors'
            >
              Log Out
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Header;