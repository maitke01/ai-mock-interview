import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)
      formData.append('confirmPassword', confirmPassword)

      const response = await fetch('/register', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const message = await response.text()
        console.log('Registration successful:', message)
        // Handle successful registration (e.g., redirect or update app state)
      } else {
        const errorMessage = await response.text()
        setError(errorMessage)
      }
    } catch (err) {
      console.error(err)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md'>
        <h1 className='mb-6 text-2xl font-bold text-center text-gray-800 dark:text-white'>Sign Up</h1>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <div className='p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg'>
              {error}
            </div>
          )}

          <div>
            <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300'>Username</label>
            <input
              type='text'
              placeholder='Enter your username'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className='w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-blue-400 focus:outline-none'
            />
          </div>

          <div>
            <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300'>Password</label>
            <input
              type='password'
              placeholder='Enter your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className='w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-blue-400 focus:outline-none'
            />
          </div>

          <div>
            <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300'>Confirm Password</label>
            <input
              type='password'
              placeholder='Confirm your password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className='w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-blue-400 focus:outline-none'
            />
          </div>

          <button
            type='submit'
            disabled={isLoading}
            className='w-full py-2 font-semibold bg-black dark:bg-blue-600 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className='mt-6 text-sm text-center text-gray-600 dark:text-gray-400'>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className='font-semibold text-black dark:text-blue-400 hover:underline'
          >
            Login
          </button>
        </p>
      </div>
    </div>
  )
}

export default Signup
