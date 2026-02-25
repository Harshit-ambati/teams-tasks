import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';
import TaskContext from '../context/TaskContextObject';
import ProjectContext from '../context/ProjectContextObject';
import { resourceRequestApi } from '../api/resourceRequestApi';
import { auditLogApi } from '../api/auditLogApi';
import { getCurrentUser } from '../utils/authStorage';

function Dashboard() {
  const currentUser = getCurrentUser();
  const role = currentUser?.role;
  const canReviewRequests = role === 'admin' || role === 'department_leader';
  const canViewGlobalAuditLogs = role === 'admin';

  const [resourceRequests, setResourceRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [requestError, setRequestError] = useState('');

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

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRequests().catch(() => {});
      loadAuditLogs().catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [loadRequests, loadAuditLogs]);

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { todo, inProgress, completed };
  }, [tasks]);

  const projectPreview = projects.slice(0, 3);
  const pendingRequests = resourceRequests.filter((request) => request.status === 'pending');
  const totalMembers = Object.values(projectTeams).reduce((acc, team) => acc + (team?.members?.length || 0), 0);

  const recentActivities = auditLogs.slice(0, 6);

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        <div className="main-content">
          <div className="header-flex">
            <h2>Management Overview</h2>
            <div className="date-display">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
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

          <div className="section teams-section">
            <div className="section-header">
              <h3>Teams</h3>
              <Link to="/teams" className="btn btn-secondary btn-sm">
                View All
              </Link>
            </div>
            <div className="team-summary-card">
              <p>Pending resource requests</p>
              <h4>{pendingRequests.length}</h4>
            </div>
          </div>
        </div>

        <div className="side-panel">
          <div className="panel-card activity-feed">
            <h3>Recent Activity</h3>
            <div className="feed-list">
              {recentActivities.map((activity) => (
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
              ))}
            </div>
            <div className="quick-actions-panel">
              <h4>Quick Actions</h4>
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
          </div>

          {canReviewRequests && (
            <div className="panel-card activity-feed">
              <h3>Pending Resource Requests</h3>
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
      </div>
    </div>
  );
}

export default Dashboard;
