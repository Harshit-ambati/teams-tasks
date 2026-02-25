import { useContext, useEffect, useMemo, useState } from 'react';
import '../styles/ProjectsPage.css';
import ProjectContext from '../context/ProjectContextObject';
import { resourceRequestApi } from '../api/resourceRequestApi';
import { departmentApi } from '../api/departmentApi';
import { auditLogApi } from '../api/auditLogApi';
import { getCurrentUser } from '../utils/authStorage';

function NewProjectModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onCreate({ title, description, status });
    onClose();
  };

  return (
    <div className="projects-modal-overlay" onClick={onClose}>
      <div className="projects-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="projects-modal-header">
          <h3>Create New Project</h3>
          <button className="projects-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="projects-form-group">
            <label>Project Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </div>
          <div className="projects-form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows="3"
            />
          </div>
          <div className="projects-form-group">
            <label>Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="projects-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestTeamModal({ project, onClose, onSubmitted }) {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [requestedRoles, setRequestedRoles] = useState('');
  const [requestedMembers, setRequestedMembers] = useState([]);
  const [error, setError] = useState('');

  const selectedDepartment = useMemo(
    () => departments.find((department) => department._id === departmentId),
    [departments, departmentId]
  );

  useEffect(() => {
    departmentApi
      .getAll()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!departmentId) {
      setError('Department is required');
      return;
    }
    try {
      await resourceRequestApi.create({
        projectId: project._id,
        departmentId,
        requestedRoles: requestedRoles
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean),
        requestedMembers,
      });
      onSubmitted();
    } catch (requestError) {
      setError(requestError.message || 'Request creation failed');
    }
  };

  return (
    <div className="projects-modal-overlay" onClick={onClose}>
      <div className="projects-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="projects-modal-header">
          <h3>Request Team Members</h3>
          <button className="projects-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="projects-form-group">
            <label>Department</label>
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="projects-form-group">
            <label>Roles (comma separated)</label>
            <input
              value={requestedRoles}
              onChange={(event) => setRequestedRoles(event.target.value)}
              placeholder="backend,designer"
            />
          </div>
          <div className="projects-form-group">
            <label>Specific Members (optional)</label>
            <div className="member-chip-list">
              {(selectedDepartment?.members || []).map((member) => {
                const checked = requestedMembers.includes(member._id);
                return (
                  <label
                    key={member._id}
                    className={`member-chip selectable ${checked ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setRequestedMembers((prev) =>
                          event.target.checked
                            ? [...prev, member._id]
                            : prev.filter((id) => id !== member._id)
                        );
                      }}
                    />
                    {member.name}
                  </label>
                );
              })}
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="projects-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const user = getCurrentUser();
  const role = user?.role || 'team_member';
  const canCreateProject = ['admin', 'project_manager'].includes(role);
  const canViewProjectLogs = ['admin', 'project_manager'].includes(role);

  const { projects, projectTeams, createProject, deleteProject, fetchProjectTeam } = useContext(ProjectContext);
  const [projectRequests, setProjectRequests] = useState({});
  const [projectAuditLogs, setProjectAuditLogs] = useState({});
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [requestProject, setRequestProject] = useState(null);

  useEffect(() => {
    projects.forEach((project) => {
      fetchProjectTeam(project._id).catch(() => {});
      if (canViewProjectLogs) {
        resourceRequestApi
          .getByProject(project._id)
          .then((data) => {
            setProjectRequests((prev) => ({ ...prev, [project._id]: Array.isArray(data) ? data : [] }));
          })
          .catch(() => {
            setProjectRequests((prev) => ({ ...prev, [project._id]: [] }));
          });
        auditLogApi
          .getByProject(project._id)
          .then((data) => {
            setProjectAuditLogs((prev) => ({ ...prev, [project._id]: Array.isArray(data) ? data : [] }));
          })
          .catch(() => {
            setProjectAuditLogs((prev) => ({ ...prev, [project._id]: [] }));
          });
      } else {
        setProjectRequests((prev) => ({ ...prev, [project._id]: [] }));
        setProjectAuditLogs((prev) => ({ ...prev, [project._id]: [] }));
      }
    });
  }, [projects, fetchProjectTeam, canViewProjectLogs]);

  return (
    <div className="projects-page">
      {isProjectModalOpen && (
        <NewProjectModal onClose={() => setIsProjectModalOpen(false)} onCreate={createProject} />
      )}
      {requestProject && (
        <RequestTeamModal
          project={requestProject}
          onClose={() => setRequestProject(null)}
          onSubmitted={async () => {
            const data = await resourceRequestApi.getByProject(requestProject._id);
            setProjectRequests((prev) => ({ ...prev, [requestProject._id]: data }));
            setRequestProject(null);
          }}
        />
      )}
      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>Backend-driven project portfolio using MongoDB `_id` entities.</p>
        </div>
        {canCreateProject && (
          <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>
            + New Project
          </button>
        )}
      </div>

      <div className="projects-grid">
        {projects.map((project) => {
          const team = projectTeams[project._id];
          const requests = projectRequests[project._id] || [];
          const logs = projectAuditLogs[project._id] || [];
          return (
            <article key={project._id} className={`project-card ${project.status}`}>
              <div className="project-header">
                <h4>{project.title}</h4>
                <span className={`status-badge ${project.status}`}>{project.status}</span>
              </div>
              <p className="project-desc">{project.description}</p>
              <p className="project-members">Team members: {team?.members?.length || 0}</p>
              <div className="project-team-section">
                <p className="project-team-title">Dynamic Project Team</p>
                <div className="project-team-list">
                  {(team?.members || []).map((member) => (
                    <span key={member._id} className="member-chip">
                      {member.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="project-team-section">
                <p className="project-team-title">Resource Requests</p>
                <div className="project-team-list">
                  {requests.slice(0, 3).map((request) => (
                    <span key={request._id} className="member-chip">
                      {request.status}
                    </span>
                  ))}
                </div>
              </div>
              <div className="project-team-section">
                <p className="project-team-title">Audit Logs</p>
                <div className="project-team-list">
                  {logs.slice(0, 2).map((log) => (
                    <span key={log._id} className="member-chip">
                      {log.action}
                    </span>
                  ))}
                </div>
              </div>
              {canCreateProject && (
                <button className="btn btn-secondary btn-sm btn-block" onClick={() => setRequestProject(project)}>
                  Request Team Members
                </button>
              )}
              {role === 'admin' && (
                <button className="btn btn-secondary btn-sm btn-block" onClick={() => deleteProject(project._id)}>
                  Delete Project
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectsPage;
