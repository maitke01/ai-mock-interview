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
              className='w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none'
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
              className='w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none'
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
              className='w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none'
            />
          </div>

          <button
            type='submit'
            disabled={isLoading}
            className='mt-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-00 text-white px-6 py-2 rounded-md font-medium transition-colors w-full border-2 border-transparent'
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className='mt-6 text-sm font-bold text-center text-gray-600 dark:text-gray-400'>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className='bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white px-3 py-1 rounded-md font-medium transition-colors border-2 border-transparent underline'
          >
            Login
          </button>
        </p>
      </div>
    </div>
  )
}

export default Signup
