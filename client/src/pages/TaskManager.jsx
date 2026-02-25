import { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import TaskStats from '../components/TaskStats';
import '../styles/TaskManager.css';
import TaskContext from '../context/TaskContextObject';
import ProjectContext from '../context/ProjectContextObject';
import { subtaskApi } from '../api/subtaskApi';
import { collaborationRequestApi } from '../api/collaborationRequestApi';
import { getCurrentUser } from '../utils/authStorage';

export default function TaskManager() {
  const { tasks, fetchTasks, createTask, updateTask, deleteTask } = useContext(TaskContext);
  const { projects, projectTeams, fetchProjectTeam } = useContext(ProjectContext);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [subtasksByTask, setSubtasksByTask] = useState({});
  const [collaborationByTask, setCollaborationByTask] = useState({});

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?._id;
  const canReviewRequests = ['admin', 'project_manager', 'department_leader', 'team_leader'].includes(
    currentUser?.role || ''
  );

  useEffect(() => {
    fetchTasks().catch(() => {});
  }, [fetchTasks]);

  useEffect(() => {
    projects.forEach((project) => {
      fetchProjectTeam(project._id).catch(() => {});
    });
  }, [projects, fetchProjectTeam]);

  const refreshTaskWorkflow = useCallback(
    async (taskId) => {
      const [subtasks, requests] = await Promise.all([
        subtaskApi.getByTask(taskId).catch(() => []),
        collaborationRequestApi.getByTask(taskId).catch(() => []),
      ]);

      setSubtasksByTask((prev) => ({ ...prev, [taskId]: Array.isArray(subtasks) ? subtasks : [] }));
      setCollaborationByTask((prev) => ({ ...prev, [taskId]: Array.isArray(requests) ? requests : [] }));
    },
    []
  );

  useEffect(() => {
    tasks.forEach((task) => {
      refreshTaskWorkflow(task._id).catch(() => {});
    });
  }, [tasks, refreshTaskWorkflow]);

  const projectsWithMembers = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        members: projectTeams[project._id]?.members || [],
      })),
    [projects, projectTeams]
  );

  const projectMembersByTask = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      const projectId = String(task.project?._id || task.project || '');
      map[task._id] = projectTeams[projectId]?.members || [];
    });
    return map;
  }, [tasks, projectTeams]);

  const tasksWithAssignee = tasks.map((task) => {
    const assignedMemberName =
      typeof task.assignedTo === 'object' && task.assignedTo?.name ? task.assignedTo.name : '';

    return {
      ...task,
      assignedMemberName,
    };
  });

  const filteredTasks = tasksWithAssignee.filter((task) => {
    const title = String(task.title || '');
    const description = String(task.description || '');
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    'in-progress': tasks.filter((t) => t.status === 'in-progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  const handleSubmit = async (data) => {
    if (editingTask) {
      await updateTask(editingTask._id, data);
      setEditingTask(null);
      return;
    }
    await createTask(data);
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const statusCycle = {
      todo: 'in-progress',
      'in-progress': 'completed',
      completed: 'todo',
    };
    await updateTask(taskId, { status: statusCycle[currentStatus] });
  };

  const toggleTaskCompletion = async (taskId) => {
    const current = tasks.find((task) => task._id === taskId);
    if (!current) return;
    const nextStatus = current.status === 'completed' ? 'todo' : 'completed';
    await updateTask(taskId, { status: nextStatus });
  };

  const handleCreateSubtask = async (taskId, payload) => {
    await subtaskApi.create({ parentTaskId: taskId, ...payload });
    await fetchTasks();
    await refreshTaskWorkflow(taskId);
  };

  const handleToggleSubtaskStatus = async (subtaskId, status) => {
    const updated = await subtaskApi.update(subtaskId, { status });
    const taskId = String(updated.parentTaskId?._id || updated.parentTaskId);
    await fetchTasks();
    await refreshTaskWorkflow(taskId);
  };

  const handleDeleteSubtask = async (subtaskId, taskId) => {
    await subtaskApi.remove(subtaskId);
    await fetchTasks();
    await refreshTaskWorkflow(taskId);
  };

  const handleCreateCollaborationRequest = async (taskId, payload) => {
    await collaborationRequestApi.create({ taskId, ...payload });
    await refreshTaskWorkflow(taskId);
  };

  const handleApproveRequest = async (requestId, taskId) => {
    await collaborationRequestApi.approve(requestId);
    await fetchTasks();
    await refreshTaskWorkflow(taskId);
  };

  const handleRejectRequest = async (requestId, taskId) => {
    await collaborationRequestApi.reject(requestId);
    await refreshTaskWorkflow(taskId);
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
            key={editingTask ? editingTask._id : 'new'}
            projects={projectsWithMembers}
            onSubmit={handleSubmit}
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
            subtasksByTask={subtasksByTask}
            onCreateSubtask={handleCreateSubtask}
            onToggleSubtaskStatus={handleToggleSubtaskStatus}
            onDeleteSubtask={handleDeleteSubtask}
            collaborationByTask={collaborationByTask}
            onCreateCollaborationRequest={handleCreateCollaborationRequest}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            canReviewRequests={canReviewRequests}
            projectMembersByTask={projectMembersByTask}
            currentUserId={currentUserId}
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
