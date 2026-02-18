import { createContext, useState, useEffect } from 'react';

export const TaskContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // persist to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (taskData) => {
    const newTask = {
      id: Date.now(),
      ...taskData,
      status: 'todo',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTask = (id, updates) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
            ...task,
            ...updates,
            completedAt:
              updates.status === 'completed' && task.status !== 'completed'
                ? new Date().toISOString()
                : task.completedAt,
          }
          : task
      )
    );
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const toggleTaskStatus = (id, currentStatus) => {
    const statusCycle = {
      todo: 'in-progress',
      'in-progress': 'completed',
      completed: 'todo',
    };
    updateTask(id, { status: statusCycle[currentStatus] });
  };

  const toggleTaskCompletion = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateTask(id, { status: newStatus });
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        toggleTaskCompletion,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}
