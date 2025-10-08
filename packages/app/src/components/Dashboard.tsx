import type React from 'react'
import { useNavigate } from 'react-router-dom'

import { useEffect, useState } from 'react'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [atsScore, setAtsScore] = useState<number | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('atsScore')
    if (s !== null) setAtsScore(Number(s))
  }, [])

  // expose a window hook for other components to update ATS score if needed
  useEffect(() => {
    ;(window as any).updateAtsScore = (n: number) => {
      setAtsScore(n)
      localStorage.setItem('atsScore', String(n))
    }
  }, [])

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='bg-blue-600 dark:bg-blue-800 shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-2xl font-bold text-white'>AI Resume & Interview Trainer</h1>
            <nav className='flex space-x-8'>
              <a
                href='#'
                className='text-white font-bold hover:text-blue-200 font-medium'
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </a>
              <a
                href='#'
                className='text-white font-bold hover:text-blue-200 font-medium'
                onClick={() => navigate('/resume')}
              >
                Resume Builder
              </a>
              <a
                href='#'
                className='text-white font-bold hover:text-blue-200 font-medium'
                onClick={() => navigate('/interview')}
              >
                Mock Interview
              </a>
            </nav>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='mb-8'>
            <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Welcome back!</h2>
            <p className='text-gray-600 dark:text-gray-400'>
              You have 1 scheduled interview and 0 tasks to complete this week.
              
            </p>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Your Progress</h3>
              </div>
              <div className='px-6 py-4 space-y-6'>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Resume Completion</span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Interview Practice</span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Job Application Readiness
                    </span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Software Engineer Match
                    </span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Upcoming Mock Interviews</h3>
              </div>
              <div className='px-6 py-4'>
                <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <div className='w-1 h-12 bg-blue-500 dark:bg-blue-400 rounded'></div>
                      <div>
                        <h4 className='font-semibold text-gray-900 dark:text-white'>
                          Software Engineer Technical Interview
                        </h4>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>Tomorrow, 10:00 AM</p>
                      </div>
                    </div>

                    
                    <button
                      className='border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-transparent px-6 py-2 rounded-md font-medium transition-colors'
                      onClick={() => navigate('/interview')}
                    >
                      Start
                    </button>
                  </div>
                </div>
                <button
                  className='w-full border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-transparent py-2 px-4 rounded-md font-medium transition-colors'

                >
                  + Schedule New Interview
                </button>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Resume Analysis</h3>
              </div>
              <div className='px-6 py-4'>
                <div className='grid grid-cols-3 gap-4'>
                  <div className='text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1'>{atsScore ?? 0}</div>
                      <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>/100</div>
                      <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>ATS Score</div>
                  </div>
                  <div className='text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1'>0</div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>/100</div>
                    <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>Keyword Match</div>
                  </div>
                  <div className='text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1'>0</div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>/100</div>
                    <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>Readability</div>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Recent Interview Performance</h3>
              </div>
              <div className='px-6 py-4'>
                <div className='h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center relative'>
                  {/* Simple chart representation */}
                  <div className='absolute top-4 right-4 flex space-x-4 text-xs'>
                    <div className='flex items-center space-x-1'>
                      <div className='w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full'></div>
                      <span className='text-gray-600 dark:text-gray-400'>Content Quality</span>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <div className='w-3 h-3 bg-orange-500 dark:bg-orange-400 rounded-full'></div>
                      <span className='text-gray-600 dark:text-gray-400'>Confidence</span>
                    </div>
                  </div>
                  <div className='text-center text-gray-500 dark:text-gray-400'>
                    <div className='text-sm mb-2'>Performance trending upward</div>
                    <div className='flex justify-between w-full px-8 text-xs text-gray-400 dark:text-gray-500'>
                      <span>Session 1</span>
                      <span>Session 2</span>
                      <span>Session 3</span>
                      <span>Session 4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
