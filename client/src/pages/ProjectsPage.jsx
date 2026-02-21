import { useContext, useState } from 'react';
import '../styles/ProjectsPage.css';
import { ProjectContext } from '../context/ProjectContext';

function NewProjectModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title, description, status, progress: 0 });
    onClose();
  };

  return (
    <div className="projects-modal-overlay" onClick={onClose}>
      <div className="projects-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="projects-modal-header">
          <h3>Create New Project</h3>
          <button className="projects-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="projects-form-group">
            <label>Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>
          <div className="projects-form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the project goals..."
              rows="3"
            />
          </div>
          <div className="projects-form-group">
            <label>Initial Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="projects-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageTeamModal({
  project,
  teamMembers,
  onClose,
  onAssignMember,
  onRemoveMember,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const assignedIds = new Set(project.members.map((member) => member.id));
  const availableMembers = teamMembers.filter((member) => !assignedIds.has(member.id));

  return (
    <div className="projects-modal-overlay" onClick={onClose}>
      <div className="projects-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="projects-modal-header">
          <h3>Manage Team: {project.title}</h3>
          <button className="projects-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="projects-form-group">
          <label>Add Existing Member</label>
          <div className="inline-controls">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">Select team member</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (!selectedMemberId) return;
                onAssignMember(project.id, selectedMemberId);
                setSelectedMemberId('');
              }}
              disabled={!selectedMemberId}
            >
              Add
            </button>
          </div>
        </div>

        <div className="team-list">
          {project.members.length === 0 ? (
            <p className="team-empty">No members assigned to this project.</p>
          ) : (
            project.members.map((member) => (
              <div key={member.id} className="team-member-row">
                <div>
                  <p className="team-member-name">{member.name}</p>
                  <p className="team-member-role">{member.role}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onRemoveMember(project.id, member.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const { projects, teamMembers, addProject, addMemberToProject, removeMemberFromProject } =
    useContext(ProjectContext);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [teamProjectId, setTeamProjectId] = useState(null);
  const activeTeamProject = projects.find((project) => project.id === teamProjectId) || null;

  return (
    <div className="projects-page">
      {isProjectModalOpen && (
        <NewProjectModal onClose={() => setIsProjectModalOpen(false)} onCreate={addProject} />
      )}
      {activeTeamProject && (
        <ManageTeamModal
          project={activeTeamProject}
          teamMembers={teamMembers}
          onClose={() => setTeamProjectId(null)}
          onAssignMember={addMemberToProject}
          onRemoveMember={removeMemberFromProject}
        />
      )}

      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>Manage all projects and project-level team assignments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>
          + New Project
        </button>
      </div>

      <div className="projects-grid">
        {projects.map((project) => (
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
            <p className="project-members">Team members: {project.members?.length || 0}</p>
            <button
              className="btn btn-secondary btn-sm btn-block"
              onClick={() => setTeamProjectId(project.id)}
            >
              Manage Team
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectsPage;
