import { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';
import TaskContext from '../context/TaskContextObject';

function Home() {
  const { tasks } = useContext(TaskContext);

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const total = todo + inProgress + completed;
    return { todo, inProgress, completed, total };
  }, [tasks]);

  const previewTasks = tasks.slice(0, 3);

  return (
    <div className="home">
      <section className="home-hero">
        <div className="hero-content">
          <h1>Manage projects and track tasks</h1>
          <p>Create tasks, track progress, and stay on schedule - all in the browser.</p>

          {stats.total > 0 && (
            <div className="hero-stats">
              <p>
                You currently have <strong>{stats.total}</strong> task
                {stats.total !== 1 ? 's' : ''} ({stats.todo} to do, {stats.inProgress}{' '}
                in progress, {stats.completed} completed).
              </p>
            </div>
          )}

          <div className="hero-actions">
            <Link to="/tasks" className="btn btn-primary">
              Open Tasks
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              View Dashboard
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden>
          <div className="card-mock">
            <div className="card-header" style={{ color: 'white' }}>Today</div>
            <div className="card-body">
              {previewTasks.length > 0 ? (
                previewTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`task-line ${
                      t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : ''
                    }`}
                  >
                    {t.title}
                  </div>
                ))
              ) : (
                <div className="task-line low">No tasks yet</div>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;
