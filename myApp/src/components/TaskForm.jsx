import { useState, useEffect } from 'react';
import '../styles/TaskForm.css';

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function TaskForm({ onSubmit, initialTask, onCancel, projects = [] }) {
  const [formData, setFormData] = useState(() => ({
    title: initialTask?.title || '',
    description: initialTask?.description || '',
    priority: initialTask?.priority || 'medium',
    dueDate: initialTask?.dueDate || '',
    projectId: initialTask?.projectId || '',
    assignedTo: initialTask?.assignedTo || '',
  }));

  const [errors, setErrors] = useState({});
  const selectedProject = projects.find((project) => project.id === formData.projectId);
  const teamMembers = selectedProject?.members || [];

  useEffect(() => {
    if (!formData.assignedTo) return;
    const memberExists = teamMembers.some((member) => member.id === formData.assignedTo);
    if (!memberExists) {
      setFormData((prev) => ({ ...prev, assignedTo: '' }));
    }
  }, [formData.assignedTo, teamMembers]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }
    if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'projectId' ? { assignedTo: '' } : {}),
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        projectId: '',
        assignedTo: '',
      });
    }
  };

  return (
    <div className="task-form">
      <h2 className="task-form-title">
        <span className="task-form-title-icon">
          {initialTask ? <EditIcon /> : <AddIcon />}
        </span>
        {initialTask ? 'Edit Task' : 'New Task'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Task Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter task title"
            className={errors.title ? 'input-error' : ''}
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add task details (optional)"
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Due Date</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="projectId">Project</label>
            <select
              id="projectId"
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="assignedTo">Assigned To</label>
            <select
              id="assignedTo"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              disabled={!formData.projectId || teamMembers.length === 0}
            >
              <option value="">
                {!formData.projectId
                  ? 'Select project first'
                  : teamMembers.length === 0
                    ? 'No team members in project'
                    : 'Select member'}
              </option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit" className="btn-submit">
            {initialTask ? 'Update Task' : 'Create Task'}
          </button>
          {initialTask && (
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
