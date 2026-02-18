import '../styles/TaskStats.css';

export default function TaskStats({ stats }) {
  const total = Object.values(stats).reduce((sum, arr) => sum + arr.length, 0);
  const completionRate =
    total === 0 ? 0 : Math.round((stats.completed.length / total) * 100);

  return (
    <div className="task-stats">
      <h3>📊 Overview</h3>
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card todo">
          <div className="stat-value">{stats.todo.length}</div>
          <div className="stat-label">To Do</div>
        </div>
        <div className="stat-card progress">
          <div className="stat-value">{stats['in-progress'].length}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-value">{stats.completed.length}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>
      <div className="completion-stats">
        <div className="completion-rate">
          <p className="rate-text">Completion Rate</p>
          <p className="rate-value">{completionRate}%</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
