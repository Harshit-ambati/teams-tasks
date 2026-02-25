import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';
import TaskContext from '../context/TaskContextObject';
import ProjectContext from '../context/ProjectContextObject';
import { resourceRequestApi } from '../api/resourceRequestApi';
import { auditLogApi } from '../api/auditLogApi';
import { departmentApi } from '../api/departmentApi';
import { getCurrentUser } from '../utils/authStorage';

function Dashboard() {
  const currentUser = getCurrentUser();
  const role = currentUser?.role;
  const canReviewRequests = role === 'admin' || role === 'department_leader';
  const canViewGlobalAuditLogs = role === 'admin';
  const canViewPerformance = role === 'admin' || role === 'department_leader';

  const [resourceRequests, setResourceRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedPerformanceUserId, setSelectedPerformanceUserId] = useState('');
  const [performanceChartType, setPerformanceChartType] = useState('pie');
  const [performanceSearch, setPerformanceSearch] = useState('');

  const { tasks, fetchTasks } = useContext(TaskContext);
  const { projects, projectTeams, fetchProjects, fetchProjectTeam } = useContext(ProjectContext);

  useEffect(() => {
    fetchTasks().catch(() => {});
    fetchProjects().catch(() => {});
  }, [fetchTasks, fetchProjects]);

  useEffect(() => {
    projects.forEach((project) => {
      fetchProjectTeam(project._id).catch(() => {});
    });
  }, [projects, fetchProjectTeam]);

  const loadRequests = useCallback(async () => {
    if (!canReviewRequests) {
      setResourceRequests([]);
      setRequestError('');
      return;
    }

    try {
      const data = await resourceRequestApi.getByDepartment();
      setResourceRequests(Array.isArray(data) ? data : []);
      setRequestError('');
    } catch (error) {
      setRequestError(error.message || 'Unable to load resource requests');
      setResourceRequests([]);
    }
  }, [canReviewRequests]);

  const loadAuditLogs = useCallback(async () => {
    if (!canViewGlobalAuditLogs) {
      setAuditLogs([]);
      return;
    }

    try {
      const data = await auditLogApi.getAll();
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch {
      setAuditLogs([]);
    }
  }, [canViewGlobalAuditLogs]);

  const loadDepartments = useCallback(async () => {
    if (!canViewPerformance) {
      setDepartments([]);
      return;
    }

    try {
      const data = await departmentApi.getAll();
      setDepartments(Array.isArray(data) ? data : []);
    } catch {
      setDepartments([]);
    }
  }, [canViewPerformance]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRequests().catch(() => {});
      loadAuditLogs().catch(() => {});
      loadDepartments().catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [loadRequests, loadAuditLogs, loadDepartments]);

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { todo, inProgress, completed };
  }, [tasks]);

  const projectPreview = projects.slice(0, 3);
  const pendingRequests = resourceRequests.filter((request) => request.status === 'pending');
  const totalMembers = Object.values(projectTeams).reduce((acc, team) => acc + (team?.members?.length || 0), 0);
  const totalTasks = tasks.length;
  const completionRate = totalTasks ? Math.round((stats.completed / totalTasks) * 100) : 0;

  const recentActivities = auditLogs.slice(0, 6);
  const allowedPerformanceUserIds = useMemo(() => {
    if (role !== 'department_leader') return null;

    const ids = new Set();
    departments.forEach((department) => {
      (department.members || []).forEach((member) => {
        const memberId = String(member?._id || member || '');
        if (memberId) ids.add(memberId);
      });
    });
    return ids;
  }, [departments, role]);

  const userPerformance = useMemo(() => {
    const perfMap = new Map();

    tasks.forEach((task) => {
      const assigneeId = String(task.assignedTo?._id || task.assignedTo || '');
      if (!assigneeId) return;
      if (allowedPerformanceUserIds && !allowedPerformanceUserIds.has(assigneeId)) return;

      const assigneeName = task.assignedTo?.name || 'Unknown User';
      if (!perfMap.has(assigneeId)) {
        perfMap.set(assigneeId, {
          id: assigneeId,
          name: assigneeName,
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
        });
      }

      const entry = perfMap.get(assigneeId);
      entry.total += 1;
      if (task.status === 'completed') entry.completed += 1;
      else if (task.status === 'in-progress') entry.inProgress += 1;
      else entry.todo += 1;
    });

    return [...perfMap.values()]
      .map((entry) => ({
        ...entry,
        completionRate: entry.total ? Math.round((entry.completed / entry.total) * 100) : 0,
        inProgressRate: entry.total ? Math.round((entry.inProgress / entry.total) * 100) : 0,
        todoRate: entry.total ? Math.round((entry.todo / entry.total) * 100) : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate || b.completed - a.completed || b.total - a.total)
      .slice(0, 12);
  }, [tasks, allowedPerformanceUserIds]);

  useEffect(() => {
    if (userPerformance.length === 0) {
      setSelectedPerformanceUserId('');
      return;
    }

    const exists = userPerformance.some((entry) => entry.id === selectedPerformanceUserId);
    if (!exists) {
      setSelectedPerformanceUserId(userPerformance[0].id);
    }
  }, [userPerformance, selectedPerformanceUserId]);

  const selectedPerformanceUser = useMemo(
    () => userPerformance.find((entry) => entry.id === selectedPerformanceUserId) || null,
    [userPerformance, selectedPerformanceUserId]
  );

  const filteredUserPerformance = useMemo(() => {
    const query = performanceSearch.trim().toLowerCase();
    if (!query) return userPerformance;
    return userPerformance.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [userPerformance, performanceSearch]);

  useEffect(() => {
    if (filteredUserPerformance.length === 0) return;
    const exists = filteredUserPerformance.some((entry) => entry.id === selectedPerformanceUserId);
    if (!exists) setSelectedPerformanceUserId(filteredUserPerformance[0].id);
  }, [filteredUserPerformance, selectedPerformanceUserId]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        <div className="main-content">
          <div className="admin-hero">
            <div className="hero-main">
              <h2>Admin Operations Hub</h2>
              <p>Review team workload, approve requests, and monitor delivery health in one place.</p>
            </div>
            <div className="hero-side">
              <div className="date-display">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="hero-mini-stats">
                <div>
                  <span>Task Completion</span>
                  <strong>{completionRate}%</strong>
                </div>
                <div>
                  <span>Pending Approvals</span>
                  <strong>{pendingRequests.length}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="section stats-section">
            <div className="cards">
              <div className="card">
                <h4>{projects.length}</h4>
                <p>Projects</p>
              </div>
              <div className="card">
                <h4>{totalMembers}</h4>
                <p>Team Members</p>
              </div>
              <div className="card">
                <h4>{stats.todo}</h4>
                <p>To Do</p>
              </div>
              <div className="card">
                <h4>{stats.inProgress}</h4>
                <p>In Progress</p>
              </div>
              <div className="card">
                <h4>{stats.completed}</h4>
                <p>Completed</p>
              </div>
            </div>
          </div>

          <div className="dashboard-workspace">
            <div className="workspace-primary">
              <div className="section projects-section">
                <div className="section-header">
                  <h3>Projects Preview</h3>
                  <Link to="/projects" className="btn btn-secondary btn-sm">
                    View All
                  </Link>
                </div>
                <div className="projects-grid">
                  {projectPreview.map((project) => (
                    <div key={project._id} className={`project-card ${project.status}`}>
                      <div className="project-header">
                        <h4>{project.title}</h4>
                        <span className={`status-badge ${project.status}`}>{project.status}</span>
                      </div>
                      <p className="project-desc">{project.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section activity-section">
                <div className="section-header">
                  <h3>Recent Activity</h3>
                  <span className="muted">Latest {recentActivities.length} records</span>
                </div>
                <div className="feed-list">
                  {recentActivities.length === 0 ? (
                    <p className="muted">No activity data available.</p>
                  ) : (
                    recentActivities.map((activity) => (
                      <div key={activity._id} className="feed-item">
                        <div className="feed-icon" />
                        <div className="feed-content">
                          <p>
                            <strong>{activity.performedBy?.name || 'System'}</strong> {activity.action}{' '}
                            <span className="feed-target">{activity.entityType}</span>
                          </p>
                          <span className="feed-time">
                            {activity.timestamp
                              ? new Date(activity.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {canReviewRequests && (
                <div className="section approvals-section">
                  <div className="section-header">
                    <h3>Pending Resource Requests</h3>
                    <span className="muted">{pendingRequests.length} waiting for review</span>
                  </div>
                  {requestError && <p className="form-error">{requestError}</p>}
                  {pendingRequests.length === 0 ? (
                    <p className="muted">No pending requests.</p>
                  ) : (
                    <div className="request-list">
                      {pendingRequests.map((request) => (
                        <div key={request._id} className="request-card">
                          <div className="request-meta">
                            <p className="request-title">
                              {request.projectId?.title || 'Project'} - {request.departmentId?.name}
                            </p>
                            <span className="request-subtitle">
                              Requested by {request.requestedBy?.name || 'Project Manager'}
                            </span>
                          </div>
                          <div className="request-actions">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={async () => {
                                const approved = (request.departmentId?.members || []).map((member) => member._id);
                                try {
                                  await resourceRequestApi.approve(request._id, {
                                    approvedMembers: approved,
                                  });
                                  await loadRequests();
                                  await loadAuditLogs();
                                } catch (error) {
                                  setRequestError(error.message || 'Approval failed');
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={async () => {
                                try {
                                  await resourceRequestApi.reject(request._id);
                                  await loadRequests();
                                  await loadAuditLogs();
                                } catch (error) {
                                  setRequestError(error.message || 'Rejection failed');
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="workspace-secondary">
              <div className="panel-card quick-actions-panel">
                <h3>Quick Actions</h3>
                <div className="action-buttons-vertical">
                  <Link to="/projects" className="btn btn-primary btn-block">
                    Manage Projects
                  </Link>
                  <Link to="/teams" className="btn btn-secondary btn-block">
                    Manage Teams
                  </Link>
                  <Link to="/tasks" className="btn btn-secondary btn-block">
                    Go to Tasks
                  </Link>
                </div>
              </div>

              {canViewPerformance && (
                <div className="panel-card performance-panel">
                  <div className="section-header">
                    <h3>User Performance</h3>
                    <div className="performance-chart-toggle">
                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm ${performanceChartType === 'pie' ? 'is-active' : ''}`}
                        onClick={() => setPerformanceChartType('pie')}
                      >
                        Pie
                      </button>
                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm ${performanceChartType === 'bar' ? 'is-active' : ''}`}
                        onClick={() => setPerformanceChartType('bar')}
                      >
                        Bar
                      </button>
                    </div>
                  </div>

                  {userPerformance.length === 0 ? (
                    <p className="muted">
                      {role === 'department_leader'
                        ? 'No department member performance data yet.'
                        : 'No assigned tasks yet.'}
                    </p>
                  ) : (
                    <div className="performance-layout">
                      <div className="performance-search-wrap">
                        <input
                          type="text"
                          placeholder="Search user..."
                          value={performanceSearch}
                          onChange={(event) => setPerformanceSearch(event.target.value)}
                          className="performance-search-input"
                        />
                      </div>
                      <div className="performance-user-list">
                        {filteredUserPerformance.map((userStat) => (
                          <button
                            key={userStat.id}
                            type="button"
                            className={`performance-user-btn ${
                              selectedPerformanceUserId === userStat.id ? 'is-active' : ''
                            }`}
                            onClick={() => setSelectedPerformanceUserId(userStat.id)}
                          >
                            <span>{userStat.name}</span>
                            <strong>{userStat.completionRate}%</strong>
                          </button>
                        ))}
                        {filteredUserPerformance.length === 0 && (
                          <p className="muted">No users match your search.</p>
                        )}
                      </div>

                      {selectedPerformanceUser && filteredUserPerformance.length > 0 && (
                        <div className="performance-chart-area">
                          <p className="performance-selected-name">{selectedPerformanceUser.name}</p>
                          <p className="performance-meta">
                            {selectedPerformanceUser.completed}/{selectedPerformanceUser.total} completed
                          </p>

                          {performanceChartType === 'pie' ? (
                            <div className="performance-pie-wrap">
                              <div
                                className="performance-pie"
                                style={{
                                  background: `conic-gradient(
                                    #22c55e 0 ${selectedPerformanceUser.completionRate}%,
                                    #3b82f6 ${selectedPerformanceUser.completionRate}% ${
                                    selectedPerformanceUser.completionRate + selectedPerformanceUser.inProgressRate
                                  }%,
                                    #f59e0b ${
                                    selectedPerformanceUser.completionRate + selectedPerformanceUser.inProgressRate
                                  }% 100%
                                  )`,
                                }}
                              />
                              <div className="performance-legend">
                                <span className="legend-item completed">
                                  Completed {selectedPerformanceUser.completed}
                                </span>
                                <span className="legend-item inprogress">
                                  In Progress {selectedPerformanceUser.inProgress}
                                </span>
                                <span className="legend-item todo">Todo {selectedPerformanceUser.todo}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="performance-bars">
                              <div className="perf-bar-row">
                                <label>Completed</label>
                                <div className="perf-bar-track">
                                  <div
                                    className="perf-bar-fill completed"
                                    style={{ width: `${selectedPerformanceUser.completionRate}%` }}
                                  />
                                </div>
                              </div>
                              <div className="perf-bar-row">
                                <label>In Progress</label>
                                <div className="perf-bar-track">
                                  <div
                                    className="perf-bar-fill inprogress"
                                    style={{ width: `${selectedPerformanceUser.inProgressRate}%` }}
                                  />
                                </div>
                              </div>
                              <div className="perf-bar-row">
                                <label>Todo</label>
                                <div className="perf-bar-track">
                                  <div
                                    className="perf-bar-fill todo"
                                    style={{ width: `${selectedPerformanceUser.todoRate}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="panel-card team-summary-card">
                <p>Pending resource requests</p>
                <h4>{pendingRequests.length}</h4>
                <p className="muted">
                  {totalMembers} members across {projects.length} projects
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
