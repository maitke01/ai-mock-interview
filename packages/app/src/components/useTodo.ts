import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Task {
  id: number
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: number
}

interface TodoState {
  tasks: Task[]
  addTask: (text: string, priority: 'low' | 'medium' | 'high') => void
  toggleTask: (id: number) => void
  deleteTask: (id: number) => void
  clearCompleted: () => void
  isSidebarOpen: boolean
  setSidebarOpen: (isOpen: boolean) => void
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      tasks: [],
      isSidebarOpen: true, // Default to open on first visit
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      addTask: (text, priority) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            { id: Date.now(), text, completed: false, priority, createdAt: Date.now() },
          ],
        })),
      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, completed: !task.completed } : task
          ),
        })),
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),
      clearCompleted: () =>
        set((state) => ({
          tasks: state.tasks.filter((task) => !task.completed),
        })),
    }),
    {
      name: 'todo-list-storage', // unique name for localStorage
      storage: createJSONStorage(() => localStorage), // use localStorage
    }
  )
)

export const useTodos = () => {
  const store = useTodoStore()
  return store
}