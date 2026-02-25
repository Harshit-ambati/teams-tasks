import { useCallback, useEffect, useMemo, useState } from 'react';
import { projectApi } from '../api/projectApi';
import ProjectContext from './ProjectContextObject';

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [projectTeams, setProjectTeams] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectApi.getAll();
      const safe = Array.isArray(data) ? data : [];
      setProjects(safe);
      return safe;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectTeam = useCallback(async (projectId) => {
    const team = await projectApi.getTeam(projectId);
    setProjectTeams((prev) => ({ ...prev, [projectId]: team }));
    return team;
  }, []);

  const createProject = useCallback(async (payload) => {
    const created = await projectApi.create(payload);
    setProjects((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateProject = useCallback(async (projectId, payload) => {
    const updated = await projectApi.update(projectId, payload);
    setProjects((prev) => prev.map((project) => (project._id === projectId ? updated : project)));
    return updated;
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    await projectApi.remove(projectId);
    setProjects((prev) => prev.filter((project) => project._id !== projectId));
    setProjectTeams((prev) => {
      const copy = { ...prev };
      delete copy[projectId];
      return copy;
    });
  }, []);

  useEffect(() => {
    fetchProjects().catch(() => {
      setProjects([]);
    });
  }, [fetchProjects]);

  const value = useMemo(
    () => ({
      projects,
      projectTeams,
      loading,
      fetchProjects,
      fetchProjectTeam,
      createProject,
      updateProject,
      deleteProject,
    }),
    [projects, projectTeams, loading, fetchProjects, fetchProjectTeam, createProject, updateProject, deleteProject]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
