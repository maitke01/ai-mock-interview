import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const ScheduleInterview: React.FC = () => {
  const navigate = useNavigate()
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [interviewType, setInterviewType] = useState("Technical - Algorithms")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Create new interview object
    const newInterview = {
      id: Date.now().toString(),
      date,
      time,
      type: interviewType,
      scheduledAt: new Date().toISOString(),
    }

    // Get existing interviews from localStorage
    const existingInterviews = localStorage.getItem("scheduledInterviews")
    const interviews = existingInterviews ? JSON.parse(existingInterviews) : []

    // Add new interview and save back to localStorage
    interviews.push(newInterview)
    localStorage.setItem("scheduledInterviews", JSON.stringify(interviews))

    alert("Interview scheduled!")
    navigate("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-10">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 w-full max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Schedule Interview</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select a date and time to schedule a mock interview.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
            <input
              type="time"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interview Type</label>
            <select
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
            >
              <option>Technical - Algorithms</option>
              <option>Behavioral</option>
              <option>Systems Design</option>
            </select>
          </div>
          <div className="text-center">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
              Schedule
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="ml-3 text-sm text-gray-600 dark:text-gray-300 underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ScheduleInterview
