import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className='bg-blue-600 dark:bg-blue-800 shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center py-4'>
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className='text-2xl font-bold text-white'>AI Resume & Interview Trainer</h1>
          </div>
          <nav className='flex items-center space-x-8'>
            <a href='#' className='font-bold hover:text-blue-200 font-medium' style={{ color: 'white' }} onClick={() => navigate('/dashboard')}>
              Dashboard
            </a>
            <a href='#' className='font-bold hover:text-blue-200 font-medium' style={{ color: 'white' }} onClick={() => navigate('/resume')}>
              Resume Builder
            </a>
            <a href='#' className='font-bold hover:text-blue-200 font-medium' style={{ color: 'white' }} onClick={() => navigate('/job-search')}>
              Job Search
            </a>
            <a href='#' className='font-bold hover:text-blue-200 font-medium' style={{ color: 'white' }} onClick={() => navigate('/interview')}>
              Mock Interview
            </a>
            <button
              onClick={() => navigate('/login')}
              className='bg-red-500 text-white font-semibold hover:bg-red-600 py-2 px-4 rounded-lg shadow-md transition-colors'
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