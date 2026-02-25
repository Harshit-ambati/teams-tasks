import { useCallback, useEffect, useState } from 'react';
import '../styles/TeamsPage.css';
import { departmentApi } from '../api/departmentApi';
import { userApi } from '../api/userApi';
import { getCurrentUser } from '../utils/authStorage';

function DepartmentModal({ users, onClose, onSubmit, initial = null }) {
  const [name, setName] = useState(initial?.name || '');
  const [leader, setLeader] = useState(initial?.leader?._id || initial?.leader || '');
  const [members, setMembers] = useState(initial?.members?.map((member) => member._id) || []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !leader) return;
    await onSubmit({ name, leader, members });
    onClose();
  };

  return (
    <div className="teams-modal-overlay" onClick={onClose}>
      <div className="teams-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="teams-modal-header">
          <h3>{initial ? 'Edit Department' : 'Create Department'}</h3>
          <button className="teams-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="teams-form-group">
            <label>Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </div>
          <div className="teams-form-group">
            <label>Leader</label>
            <select value={leader} onChange={(event) => setLeader(event.target.value)}>
              <option value="">Select leader</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <div className="teams-form-group">
            <label>Members</label>
            <div className="member-chip-list">
              {users.map((user) => {
                const checked = members.includes(user._id);
                return (
                  <label key={user._id} className={`member-chip selectable ${checked ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setMembers((prev) =>
                          event.target.checked
                            ? [...prev, user._id]
                            : prev.filter((id) => id !== user._id)
                        );
                      }}
                    />
                    {user.name}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="teams-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {initial ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamsPage() {
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const fetchData = useCallback(async () => {
    const [departmentData, usersData] = await Promise.all([
      departmentApi.getAll().catch(() => []),
      isAdmin ? userApi.getAll().catch(() => []) : Promise.resolve([]),
    ]);
    setDepartments(Array.isArray(departmentData) ? departmentData : []);
    setUsers(Array.isArray(usersData) ? usersData : []);
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData().catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleCreate = async (payload) => {
    await departmentApi.create(payload);
    await fetchData();
  };

  const handleUpdate = async (payload) => {
    await departmentApi.update(editingDepartment._id, payload);
    setEditingDepartment(null);
    await fetchData();
  };

  return (
    <div className="teams-page">
      {isModalOpen && isAdmin && (
        <DepartmentModal
          users={users}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}
      {editingDepartment && isAdmin && (
        <DepartmentModal
          users={users}
          initial={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSubmit={handleUpdate}
        />
      )}

      <div className="teams-header">
        <div>
          <h2>Departments</h2>
          <p>Department ownership and member assignment from backend data.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Create Department
          </button>
        )}
      </div>

      <div className="teams-grid">
        {departments.map((department) => (
          <article key={department._id} className="team-card">
            <div className="team-card-header">
              <h3>{department.name}</h3>
              <span className="team-type-badge engineering">Department</span>
            </div>
            <p className="team-description">
              Leader: {department.leader?.name || 'Unassigned'}
            </p>
            <div className="team-members-preview">
              {(department.members || []).slice(0, 5).map((member) => (
                <span key={member._id} className="member-chip">
                  {member.name}
                </span>
              ))}
            </div>
            <div className="team-card-footer">
              <span className="team-meta">Members: {department.members?.length || 0}</span>
              {isAdmin && (
                <div className="team-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingDepartment(department)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default TeamsPage;
