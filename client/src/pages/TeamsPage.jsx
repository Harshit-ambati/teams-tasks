import { useContext, useMemo, useState } from 'react';
import '../styles/TeamsPage.css';
import ProjectContext from '../context/ProjectContextObject';
import { ALL_TEAM_TYPES, DEFAULT_TEAM_TYPE, TEAM_TYPES, getTeamTypeMeta } from '../constants/teamTypes';

function CreateTeamModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(DEFAULT_TEAM_TYPE);
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, type, description });
    onClose();
  };

  return (
    <div className="teams-modal-overlay" onClick={onClose}>
      <div className="teams-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="teams-modal-header">
          <h3>Create Team</h3>
          <button className="teams-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="teams-form-group">
            <label>Team Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth Squad"
              autoFocus
            />
          </div>
          <div className="teams-form-group">
            <label>Team Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TEAM_TYPES.map((teamType) => (
                <option key={teamType.value} value={teamType.value}>
                  {teamType.label}
                </option>
              ))}
            </select>
          </div>
          <div className="teams-form-group">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this team owns..."
              rows="3"
            />
          </div>
          <div className="teams-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    onCreate({ name, role });
    onClose();
  };

  return (
    <div className="teams-modal-overlay" onClick={onClose}>
      <div className="teams-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="teams-modal-header">
          <h3>Add Team Member</h3>
          <button className="teams-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="teams-form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Riley Morgan"
              autoFocus
            />
          </div>
          <div className="teams-form-group">
            <label>Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
            />
          </div>
          <div className="teams-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageMembersModal({
  team,
  teamMembers,
  onClose,
  onAssignMember,
  onRemoveMember,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const assignedIds = new Set(team.memberIds || []);
  const availableMembers = teamMembers.filter((member) => !assignedIds.has(member.id));
  const assignedMembers = teamMembers.filter((member) => assignedIds.has(member.id));

  return (
    <div className="teams-modal-overlay" onClick={onClose}>
      <div className="teams-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="teams-modal-header">
          <h3>Manage Members: {team.name}</h3>
          <button className="teams-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="teams-form-group">
          <label>Add Existing Member</label>
          <div className="teams-inline-controls">
            <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)}>
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
                onAssignMember(team.id, selectedMemberId);
                setSelectedMemberId('');
              }}
              disabled={!selectedMemberId}
            >
              Add
            </button>
          </div>
        </div>

        <div className="teams-member-list">
          {assignedMembers.length === 0 ? (
            <p className="empty">No members assigned to this team yet.</p>
          ) : (
            assignedMembers.map((member) => (
              <div key={member.id} className="teams-member-row">
                <div>
                  <p className="teams-member-name">{member.name}</p>
                  <p className="teams-member-role">{member.role}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onRemoveMember(team.id, member.id)}
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

function TeamsPage() {
  const {
    teams,
    teamMembers,
    addTeam,
    addTeamMember,
    removeTeam,
    addMemberToTeam,
    removeMemberFromTeam,
  } =
    useContext(ProjectContext);
  const [filterType, setFilterType] = useState(ALL_TEAM_TYPES);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [manageTeamId, setManageTeamId] = useState(null);

  const filteredTeams = useMemo(
    () => teams.filter((team) => filterType === ALL_TEAM_TYPES || team.type === filterType),
    [teams, filterType]
  );
  const typeCounts = useMemo(
    () =>
      teams.reduce((acc, team) => {
        acc[team.type] = (acc[team.type] || 0) + 1;
        return acc;
      }, {}),
    [teams]
  );
  const activeTypeLabel =
    filterType === ALL_TEAM_TYPES ? 'All Types' : getTeamTypeMeta(filterType).label;
  const activeTeam = teams.find((team) => team.id === manageTeamId) || null;

  return (
    <div className="teams-page">
      {isCreateModalOpen && (
        <CreateTeamModal onClose={() => setIsCreateModalOpen(false)} onCreate={addTeam} />
      )}
      {isAddMemberModalOpen && (
        <AddMemberModal
          onClose={() => setIsAddMemberModalOpen(false)}
          onCreate={addTeamMember}
        />
      )}
      {activeTeam && (
        <ManageMembersModal
          team={activeTeam}
          teamMembers={teamMembers}
          onClose={() => setManageTeamId(null)}
          onAssignMember={addMemberToTeam}
          onRemoveMember={removeMemberFromTeam}
        />
      )}

      <div className="teams-header">
        <div>
          <h2>Teams</h2>
          <p>Create and organize teams by category.</p>
        </div>
        <div className="teams-header-actions">
          <button className="btn btn-secondary" onClick={() => setIsAddMemberModalOpen(true)}>
            + Add Member
          </button>
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            + Create Team
          </button>
        </div>
      </div>

      <div className="teams-overview">
        <div className="overview-card">
          <span>Total Teams</span>
          <strong>{teams.length}</strong>
        </div>
        <div className="overview-card">
          <span>Showing</span>
          <strong>{filteredTeams.length}</strong>
        </div>
        <div className="overview-card">
          <span>Active Filter</span>
          <strong>{activeTypeLabel}</strong>
        </div>
      </div>

      <div className="teams-controls">
        <div className="filter-pills" role="tablist" aria-label="Filter teams by type">
          <button
            type="button"
            className={`filter-pill ${filterType === ALL_TEAM_TYPES ? 'is-active' : ''}`}
            onClick={() => setFilterType(ALL_TEAM_TYPES)}
          >
            All ({teams.length})
          </button>
          {TEAM_TYPES.map((teamType) => (
            <button
              key={teamType.value}
              type="button"
              className={`filter-pill ${filterType === teamType.value ? 'is-active' : ''}`}
              onClick={() => setFilterType(teamType.value)}
            >
              {teamType.label} ({typeCounts[teamType.value] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="teams-grid">
        {filteredTeams.length === 0 ? (
          <p className="empty">No teams found for the selected type.</p>
        ) : (
          filteredTeams.map((team) => {
            const typeMeta = getTeamTypeMeta(team.type);
            const assignedMembers = teamMembers.filter((member) => (team.memberIds || []).includes(member.id));
            return (
              <article key={team.id} className={`team-card ${typeMeta.badgeClass}`}>
                <div className="team-card-header">
                  <h3>{team.name}</h3>
                  <span className={`team-type-badge ${typeMeta.badgeClass}`}>{typeMeta.label}</span>
                </div>
                <p className="team-description">
                  {team.description || 'No description provided yet.'}
                </p>
                <div className="team-members-preview">
                  {assignedMembers.length === 0 ? (
                    <p className="team-members-empty">No members assigned</p>
                  ) : (
                    assignedMembers.slice(0, 3).map((member) => (
                      <span key={member.id} className="member-chip">
                        {member.name}
                      </span>
                    ))
                  )}
                  {assignedMembers.length > 3 && (
                    <span className="member-chip more">+{assignedMembers.length - 3} more</span>
                  )}
                </div>
                <div className="team-card-footer">
                  <span className="team-meta">Members: {assignedMembers.length}</span>
                  <div className="team-card-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setManageTeamId(team.id)}
                    >
                      Manage Members
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => removeTeam(team.id)}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="team-card-footer secondary">
                  <span className="team-meta">Category: {typeMeta.label}</span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TeamsPage;
