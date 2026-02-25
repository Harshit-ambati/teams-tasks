import { useCallback, useMemo, useState } from 'react';
import { taskApi } from '../api/taskApi';
import TaskContext from './TaskContextObject';

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async (projectId = null) => {
    setLoading(true);
    try {
      const data = projectId ? await taskApi.getByProject(projectId) : await taskApi.getAll();
      setTasks(Array.isArray(data) ? data : []);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (payload) => {
    const created = await taskApi.create(payload);
    setTasks((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    const updated = await taskApi.update(id, updates);
    setTasks((prev) => prev.map((task) => (task._id === id ? updated : task)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await taskApi.remove(id);
    setTasks((prev) => prev.filter((task) => task._id !== id));
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      loading,
      fetchTasks,
      createTask,
      updateTask,
      deleteTask,
    }),
    [tasks, loading, fetchTasks, createTask, updateTask, deleteTask]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
