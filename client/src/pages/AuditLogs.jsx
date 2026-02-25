import { useEffect, useMemo, useState } from 'react';
import '../styles/AuditLogs.css';
import { auditLogApi } from '../api/auditLogApi';

const ENTITY_OPTIONS = ['all', 'project', 'task', 'team', 'user'];

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    auditLogApi
      .getAll()
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((requestError) => setError(requestError.message || 'Failed to load audit logs'));
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
      const logDate = new Date(log.timestamp || log.createdAt || log.date);
      const fromCheck = fromDate ? logDate >= new Date(fromDate) : true;
      const toCheck = toDate ? logDate <= new Date(`${toDate}T23:59:59`) : true;
      return matchesEntity && fromCheck && toCheck;
    });
  }, [logs, entityFilter, fromDate, toDate]);

  return (
    <div className="audit-logs-page">
      <header className="audit-logs-header">
        <div>
          <h2>Audit Logs</h2>
          <p>System actions tracked for transparency and accountability.</p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <div className="audit-filters">
        <div className="filter-group">
          <label htmlFor="entityFilter">Entity</label>
          <select
            id="entityFilter"
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
          >
            {ENTITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All entities' : option}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="fromDate">From</label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="toDate">To</label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
      </div>

      <div className="audit-table">
        <div className="audit-table-row audit-table-header">
          <span>Action</span>
          <span>Entity</span>
          <span>User</span>
          <span>Date/Time</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="audit-empty">
            <p>No audit entries found for the selected filters.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div className="audit-table-row" key={log._id}>
              <span className="audit-action">{log.action}</span>
              <span className="audit-entity">
                {log.entityType}
                {log.entityId ? ` - ${String(log.entityId).slice(-6)}` : ''}
              </span>
              <span className="audit-user">{log.performedBy?.name || log.performedBy?.email || 'System'}</span>
              <span className="audit-date">{formatTimestamp(log.timestamp || log.createdAt || log.date)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AuditLogs;
