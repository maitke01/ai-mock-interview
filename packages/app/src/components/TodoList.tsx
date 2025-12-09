import React, { useState, useEffect, useRef } from 'react'
import { useTodos } from './useTodo'


interface TodoListProps {
  onWidthChange: (width: number) => void
}

const TodoList: React.FC<TodoListProps> = ({ onWidthChange }) => {
  const { tasks, addTask, toggleTask, deleteTask, clearCompleted, isSidebarOpen, setSidebarOpen } = useTodos()
  const [inputValue, setInputValue] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const minWidth = 280;
  const maxWidth = window.innerWidth / 2;

  useEffect(() => {
    // Notify parent component of width changes
    onWidthChange(isSidebarOpen ? sidebarWidth : 0);
  }, [isSidebarOpen, sidebarWidth, onWidthChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  const handleAddTodo = () => {
    if (inputValue.trim()) {
      addTask(inputValue.trim(), priority)

      setInputValue('');
      setPriority('medium');
    }
  };

  const handleToggleTodo = (id: number) => {
    toggleTask(id);
  };

  const handleDeleteTodo = (id: number) => {
    deleteTask(id);
      
};

  const handleClearCompleted = () => {
    clearCompleted()
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-500';
      case 'medium':
        return 'border-l-4 border-yellow-500';
      case 'low':
        return 'border-l-4 border-green-500';
      default:
        return '';
    }
  };

    const filteredTodos = tasks.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

    const activeTodosCount = tasks.filter(todo => !todo.completed).length;
    const completedTodosCount = tasks.filter(todo => todo.completed).length;


  return (
    <>
      {/* Open Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-1/2 left-0 -translate-y-1/2 z-40 !bg-blue-600 p-4 rounded-r-xl shadow-2xl hover:!bg-blue-700 transition-all duration-300 hover:pl-5 ${
          isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        title="Open To-Do List"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className={`fixed top-0 left-0 h-full !bg-white dark:!bg-gray-900 shadow-2xl z-50 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 bg-blue-600 text-white border-b border-blue-700">
          <div>
            <h2 className="text-lg font-semibold">My Tasks</h2>
            <p className="text-xs opacity-80 mt-1">
              {activeTodosCount} active · {completedTodosCount} completed
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-full transition-all duration-200 !bg-transparent hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] hover:!bg-blue-700"
            title="Close To-Do List"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {f}
              {f === 'active' && activeTodosCount > 0 && (
                <span className="ml-1 text-xs !bg-blue-600 text-white rounded-full px-2 py-0.5">
                  {activeTodosCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Todo List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTodos.length === 0 ? (
            <div className="text-center mt-8">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filter === 'all' ? 'No tasks yet. Add one below!' : `No ${filter} tasks`}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredTodos.map(todo => (
                <li
                  key={todo.id}
                  className={`flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group hover:shadow-md transition-all ${getPriorityColor(
                    todo.priority
                  )}`}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id)}
                    className="h-5 w-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm break-words ${
                        todo.completed
                          ? 'line-through text-gray-500 dark:text-gray-500'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {todo.text}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        todo.priority === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : todo.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {todo.priority}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(todo.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1"
                    title="Delete task"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Clear Completed Button */}
        {completedTodosCount > 0 && (
          <div className="px-4 pb-2">
            <button
              onClick={handleClearCompleted}
              className="w-full py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Clear {completedTodosCount} completed task{completedTodosCount > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Add Task Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Add a new task..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddTodo();
                }
              }}
            />
            <div className="flex gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button
                onClick={handleAddTodo}
                className="px-6 py-2 !bg-blue-600 text-white text-sm font-medium rounded-lg hover:!bg-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        style={{ left: `${sidebarWidth}px` }}
        className="fixed top-0 h-full w-1 cursor-ew-resize z-50 hover:!bg-blue-500 transition-colors group"
      >
        <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-12 !bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </>
  );
};

export default TodoList;