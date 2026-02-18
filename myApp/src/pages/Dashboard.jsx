import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import "../styles/Dashboard.css";
import { TaskContext } from "../context/TaskContext";
import { ProjectContext } from "../context/ProjectContext";

function NewProjectModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planning");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({
      title,
      description,
      status,
      progress: 0
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe the project goals..."
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Initial Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  const { tasks } = useContext(TaskContext);
  const projectContext = useContext(ProjectContext);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!projectContext) {
    return <div style={{ color: 'red', padding: 20 }}>Error: ProjectContext is missing. Check App.jsx wrapping.</div>;
  }

  const { projects, activities, addProject } = projectContext;

  // recompute statistics whenever task list changes
  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { todo, 'in-progress': inProgress, completed };
  }, [tasks]);

  const total = stats.todo + stats['in-progress'] + stats.completed;

  return (
    <div className="dashboard-container">
      {isModalOpen && (
        <NewProjectModal
          onClose={() => setIsModalOpen(false)}
          onCreate={addProject}
        />
      )}

      <div className="dashboard-grid">

        {/* Main Content Area */}
        <div className="main-content">
          <div className="header-flex">
            <h2>Management Overview</h2>
            <div className="date-display">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>

          {/* Quick Stats Row (Preserved) */}
          <div className="section stats-section">
            <div className="cards">
              <Card title={"Total: " + total} subtitle="All Tasks" />
              <Card title={stats.todo} subtitle="To Do" />
              <Card title={stats['in-progress']} subtitle="In Progress" />
              <Card title={stats.completed} subtitle="Completed" />
            </div>
          </div>

          {/* Active Projects Section */}
          <div className="section projects-section">
            <div className="section-header">
              <h3>Active Projects</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(true)}>+ New Project</button>
            </div>

            <div className="projects-grid">
              {projects.map(project => (
                <div key={project.id} className={`project-card ${project.status}`}>
                  <div className="project-top">
                    <div className="project-header">
                      <h4>{project.title}</h4>
                      <span className={`status-badge ${project.status}`}>{project.status}</span>
                    </div>
                    <p className="project-desc">{project.description}</p>
                  </div>

                  <div className="project-bottom">
                    <div className="progress-container">
                      <div className="progress-label">
                        <span>Progress</span>
                        <span>{project.progress || 0}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${project.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: '15px' }}>Open Dashboard</button>
                  </div>
                </div>
              ))}
              {/* Add Project Card */}
              <div className="project-card add-new" onClick={() => setIsModalOpen(true)}>
                <div className="add-content">
                  <span className="plus-icon">+</span>
                  <p>Start New Project</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Activity Feed */}
        <div className="side-panel">
          <div className="panel-card activity-feed">
            <h3>Recent Activity</h3>
            <div className="feed-list">
              {activities.map(activity => (
                <div key={activity.id} className="feed-item">
                  <div className="feed-icon"></div>
                  <div className="feed-content">
                    <p>
                      <strong>{activity.user}</strong> {activity.action} <span className="feed-target">{activity.target}</span>
                    </p>
                    <span className="feed-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="quick-actions-panel">
              <h4>Quick Actions</h4>
              <div className="action-buttons-vertical">
                <Link to="/tasks" className="btn btn-primary btn-block">
                  Go to Tasks
                </Link>
                <Link to="/tasks" className="btn btn-secondary btn-block">
                  Create Task
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
