import { createContext, useMemo, useState, useEffect } from 'react';

export const ProjectContext = createContext();

const defaultTeamMembers = [
  { id: 'm1', name: 'Alex Carter', role: 'Product Manager' },
  { id: 'm2', name: 'Sam Patel', role: 'Frontend Developer' },
  { id: 'm3', name: 'Jordan Kim', role: 'UX Designer' },
];

const defaultProjects = [
  {
    id: '1',
    title: 'Website Redesign',
    description: 'Revamp the company website with modern UI.',
    status: 'active',
    progress: 75,
    members: [defaultTeamMembers[0], defaultTeamMembers[1]],
  },
  {
    id: '2',
    title: 'Mobile App',
    description: 'Develop a cross-platform mobile application.',
    status: 'planning',
    progress: 15,
    members: [defaultTeamMembers[1], defaultTeamMembers[2]],
  },
  {
    id: '3',
    title: 'Marketing Campaign',
    description: 'Q4 marketing strategy and execution.',
    status: 'completed',
    progress: 100,
    members: [defaultTeamMembers[0]],
  },
];

const normalizeMember = (member) => ({
  id: String(member.id),
  name: member.name || '',
  role: member.role || '',
});

const normalizeProject = (project, teamMembers) => {
  const teamById = new Map(teamMembers.map((member) => [member.id, member]));
  const inputMembers = Array.isArray(project.members) ? project.members : [];

  const normalizedMembers = inputMembers
    .map((member) => {
      const existing = teamById.get(String(member.id));
      if (existing) return existing;
      return normalizeMember(member);
    })
    .filter((member) => member.name.trim());

  return {
    ...project,
    id: String(project.id),
    progress: Number.isFinite(project.progress) ? project.progress : 0,
    members: normalizedMembers,
  };
};

const getUniqueMembersFromProjects = (projects) => {
  const seen = new Map();
  projects.forEach((project) => {
    (project.members || []).forEach((member) => {
      const id = String(member.id);
      if (!seen.has(id)) {
        seen.set(id, normalizeMember(member));
      }
    });
  });
  return [...seen.values()];
};

const loadInitialTeamMembers = () => {
  try {
    const saved = localStorage.getItem('teamMembers');
    if (saved) return JSON.parse(saved).map(normalizeMember);
  } catch (e) {
    // ignore malformed local storage
  }
  return defaultTeamMembers;
};

const loadInitialProjects = (seedMembers) => {
  try {
    const saved = localStorage.getItem('projects');
    const parsedProjects = saved ? JSON.parse(saved) : defaultProjects;
    return parsedProjects.map((project) => normalizeProject(project, seedMembers));
  } catch (e) {
    return defaultProjects.map((project) => normalizeProject(project, seedMembers));
  }
};

export function ProjectProvider({ children }) {
  const [teamMembers, setTeamMembers] = useState(loadInitialTeamMembers);
  const [projects, setProjects] = useState(() => loadInitialProjects(loadInitialTeamMembers()));

  const [activities, setActivities] = useState([
    { id: 1, user: 'Alex', action: 'completed a task', target: 'Homepage Hero', time: '2h ago' },
    { id: 2, user: 'Sam', action: 'added a comment', target: 'Mobile Nav', time: '4h ago' },
    { id: 3, user: 'You', action: 'created a project', target: 'Marketing Campaign', time: '1d ago' },
    { id: 4, user: 'Alex', action: 'updated status', target: 'API Integration', time: '1d ago' },
  ]);

  useEffect(() => {
    const uniqueFromProjects = getUniqueMembersFromProjects(projects);
    setTeamMembers((prev) => {
      const map = new Map(prev.map((member) => [member.id, member]));
      uniqueFromProjects.forEach((member) => {
        if (!map.has(member.id)) map.set(member.id, member);
      });
      return [...map.values()];
    });
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
  }, [teamMembers]);

  const addActivity = (activity) => {
    setActivities((prev) => [{ id: Date.now(), time: 'Just now', ...activity }, ...prev]);
  };

  const addProject = (project) => {
    const newProject = normalizeProject(
      { ...project, id: Date.now().toString(), progress: 0, members: [] },
      teamMembers
    );
    setProjects((prev) => [newProject, ...prev]);
    addActivity({ user: 'You', action: 'created project', target: project.title });
  };

  const deleteProject = (id) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const addTeamMember = (memberData) => {
    const newMember = {
      id: Date.now().toString(),
      name: memberData.name.trim(),
      role: memberData.role.trim(),
    };
    setTeamMembers((prev) => [newMember, ...prev]);
    addActivity({ user: 'You', action: 'added team member', target: newMember.name });
    return newMember;
  };

  const removeTeamMember = (memberId) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== memberId));
    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        members: project.members.filter((member) => member.id !== memberId),
      }))
    );
  };

  const addMemberToProject = (projectId, memberOrId) => {
    const memberId = typeof memberOrId === 'string' ? memberOrId : String(memberOrId.id || '');
    if (!memberId) return;

    const sourceMember = teamMembers.find((member) => member.id === memberId);
    if (!sourceMember) return;

    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        const alreadyAssigned = project.members.some((member) => member.id === memberId);
        if (alreadyAssigned) return project;
        return { ...project, members: [...project.members, sourceMember] };
      })
    );
  };

  const removeMemberFromProject = (projectId, memberId) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, members: project.members.filter((member) => member.id !== memberId) }
          : project
      )
    );
  };

  const getMemberProjectCount = (memberId) =>
    projects.filter((project) => project.members.some((member) => member.id === memberId)).length;

  const value = useMemo(
    () => ({
      projects,
      teamMembers,
      activities,
      addProject,
      deleteProject,
      addTeamMember,
      removeTeamMember,
      addMemberToProject,
      removeMemberFromProject,
      getMemberProjectCount,
    }),
    [projects, teamMembers, activities]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
