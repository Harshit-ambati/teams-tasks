import { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';
import { TaskContext } from '../context/TaskContext';
import { ProjectContext } from '../context/ProjectContext';

function Dashboard() {
  const { tasks } = useContext(TaskContext);
  const { projects, teamMembers, activities } = useContext(ProjectContext);

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { todo, inProgress, completed };
  }, [tasks]);

  const projectPreview = projects.slice(0, 3);

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
                <h4>{teamMembers.length}</h4>
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
                <div key={project.id} className={`project-card ${project.status}`}>
                  <div className="project-header">
                    <h4>{project.title}</h4>
                    <span className={`status-badge ${project.status}`}>{project.status}</span>
                  </div>
                  <p className="project-desc">{project.description}</p>
                  <div className="progress-label">
                    <span>Progress</span>
                    <span>{project.progress || 0}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${project.progress || 0}%` }} />
                  </div>
                  <p className="project-meta">Team: {project.members?.length || 0}</p>
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
              <p>Total members across teams</p>
              <h4>{teamMembers.length}</h4>
            </div>
          </div>
        </div>

        <div className="side-panel">
          <div className="panel-card activity-feed">
            <h3>Recent Activity</h3>
            <div className="feed-list">
              {activities.slice(0, 6).map((activity) => (
                <div key={activity.id} className="feed-item">
                  <div className="feed-icon" />
                  <div className="feed-content">
                    <p>
                      <strong>{activity.user}</strong> {activity.action}{' '}
                      <span className="feed-target">{activity.target}</span>
                    </p>
                    <span className="feed-time">{activity.time}</span>
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
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
