import { useContext, useState } from 'react';
import '../styles/TeamsPage.css';
import { ProjectContext } from '../context/ProjectContext';

function TeamsPage() {
  const { teamMembers, addTeamMember, removeTeamMember, getMemberProjectCount } =
    useContext(ProjectContext);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    addTeamMember({ name, role });
    setName('');
    setRole('');
  };

  return (
    <div className="teams-page">
      <div className="teams-header">
        <div>
          <h2>Teams</h2>
          <p>Add and manage team members across all projects.</p>
        </div>
      </div>

      <div className="teams-layout">
        <section className="team-form-card">
          <h3>Add Team Member</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Riley Morgan"
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Backend Engineer"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Add Member
            </button>
          </form>
        </section>

        <section className="team-list-card">
          <h3>All Team Members</h3>
          {teamMembers.length === 0 ? (
            <p className="empty">No team members yet.</p>
          ) : (
            <div className="member-list">
              {teamMembers.map((member) => (
                <div key={member.id} className="member-row">
                  <div>
                    <p className="member-name">{member.name}</p>
                    <p className="member-role">{member.role}</p>
                    <p className="member-projects">
                      Assigned projects: {getMemberProjectCount(member.id)}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeTeamMember(member.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default TeamsPage;
