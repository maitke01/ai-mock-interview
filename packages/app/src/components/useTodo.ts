import { create } from 'zustand'

export interface Task {
  id: number
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: number
}

interface TodoState {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  isSidebarOpen: boolean
  setSidebarOpen: (isOpen: boolean) => void
  fetchTodos: () => Promise<void>
  addTask: (text: string, priority: 'low' | 'medium' | 'high') => Promise<void>
  toggleTask: (id: number) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  clearCompleted: () => Promise<void>
  updateTask: (id: number, data: { text?: string; priority?: 'low' | 'medium' | 'high' }) => Promise<void>
}

export const useTodoStore = create<TodoState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  isSidebarOpen: true,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  fetchTodos: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/todos', { credentials: 'include' })
          if (!response.ok) {
            throw new Error('Failed to fetch todos')
          }
          const data = await response.json()
          set({ tasks: data.todos || [], isLoading: false })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false })
        }
      },

      addTask: async (text, priority) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text, priority })
          })
          if (!response.ok) {
            throw new Error('Failed to add todo')
          }
          const data = await response.json()
          set((state) => ({
            tasks: [data.todo, ...state.tasks],
            isLoading: false
          }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false })
        }
      },

      toggleTask: async (id) => {
        const task = get().tasks.find(t => t.id === id)
        if (!task) return

        // Optimistic update
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          )
        }))

        try {
          const response = await fetch(`/api/todo/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ completed: !task.completed })
          })
          if (!response.ok) {
            // Revert on failure
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, completed: task.completed } : t
              )
            }))
            throw new Error('Failed to update todo')
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' })
        }
      },

      deleteTask: async (id) => {
        const tasks = get().tasks
        // Optimistic update
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id)
        }))

        try {
          const response = await fetch(`/api/todo/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
          if (!response.ok) {
            // Revert on failure
            set({ tasks })
            throw new Error('Failed to delete todo')
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' })
        }
      },

      clearCompleted: async () => {
        const tasks = get().tasks
        // Optimistic update
        set((state) => ({
          tasks: state.tasks.filter((t) => !t.completed)
        }))

        try {
          const response = await fetch('/api/todos/clear-completed', {
            method: 'POST',
            credentials: 'include'
          })
          if (!response.ok) {
            // Revert on failure
            set({ tasks })
            throw new Error('Failed to clear completed todos')
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' })
        }
      },

      updateTask: async (id, data) => {
        const task = get().tasks.find(t => t.id === id)
        if (!task) return

        // Optimistic update
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...data } : t
          )
        }))

        try {
          const response = await fetch(`/api/todo/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
          })
          if (!response.ok) {
            // Revert on failure
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? task : t
              )
            }))
            throw new Error('Failed to update todo')
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }
    }))

export const useTodos = () => {
  const store = useTodoStore()
  return store
}
