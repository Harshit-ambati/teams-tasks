import '../styles/TaskStats.css';

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M20 19H4" />
      <path d="M8 16V11" />
      <path d="M12 16V8" />
      <path d="M16 16V6" />
    </svg>
  );
}

export default function TaskStats({ stats }) {
  const total = Object.values(stats).reduce((sum, arr) => sum + arr.length, 0);
  const completionRate =
    total === 0 ? 0 : Math.round((stats.completed.length / total) * 100);

  return (
    <div className="task-stats">
      <h3 className="stats-title">
        <span className="title-icon">
          <ChartIcon />
        </span>
        Overview
      </h3>
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
