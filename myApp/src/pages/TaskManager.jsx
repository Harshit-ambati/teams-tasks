import { useState, useContext } from 'react';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import TaskStats from '../components/TaskStats';
import '../styles/TaskManager.css';
import { TaskContext } from '../context/TaskContext';
import { ProjectContext } from '../context/ProjectContext';

export default function TaskManager() {
  const { tasks, addTask, updateTask, deleteTask, toggleTaskStatus, toggleTaskCompletion } =
    useContext(TaskContext);
  const { projects } = useContext(ProjectContext);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTask, setEditingTask] = useState(null);

  const tasksWithAssignee = tasks.map((task) => {
    const project = projects.find((item) => item.id === task.projectId);
    const assignedMember = project?.members?.find((member) => member.id === task.assignedTo);

    return {
      ...task,
      assignedMemberName: assignedMember?.name || '',
    };
  });

  const filteredTasks = tasksWithAssignee.filter((task) => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    'in-progress': tasks.filter((t) => t.status === 'in-progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  return (
    <div className="task-manager-container">
      <header className="task-manager-header">
        <h1>Project Management Tool</h1>
        <p>Manage and track your tasks efficiently</p>
      </header>

      <div className="task-manager-content">
        <aside className="task-manager-sidebar">
          <TaskForm
            key={editingTask ? editingTask.id : 'new'}
            projects={projects}
            onSubmit={editingTask ? (data) => updateTask(editingTask.id, data) : addTask}
            initialTask={editingTask}
            onCancel={() => setEditingTask(null)}
          />
          <TaskStats stats={tasksByStatus} />
        </aside>

        <main className="task-manager-main">
          <div className="task-manager-controls">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="filter-buttons">
              {['all', 'todo', 'in-progress', 'completed'].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <TaskList
            tasks={filteredTasks}
            onToggleStatus={toggleTaskStatus}
            onToggleCompletion={toggleTaskCompletion}
            onEdit={setEditingTask}
            onDelete={deleteTask}
          />

          {filteredTasks.length === 0 && (
            <div className="empty-state">
              <p>No tasks found. Create one to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
