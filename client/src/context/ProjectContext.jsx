import { useEffect, useState } from 'react';
import { DEFAULT_TEAM_TYPE, isValidTeamType } from '../constants/teamTypes';
import ProjectContext from './ProjectContextObject';

const defaultTeamMembers = [
  { id: 'm1', name: 'Alex Carter', role: 'Product Manager' },
  { id: 'm2', name: 'Sam Patel', role: 'Frontend Developer' },
  { id: 'm3', name: 'Jordan Kim', role: 'UX Designer' },
];

const defaultTeams = [
  {
    id: 't1',
    name: 'Core Platform',
    type: 'engineering',
    description: 'Builds and maintains core product foundations.',
    memberIds: ['m2'],
  },
  {
    id: 't2',
    name: 'Experience Studio',
    type: 'design',
    description: 'Owns visual language and interaction quality.',
    memberIds: ['m3'],
  },
  {
    id: 't3',
    name: 'Growth Engine',
    type: 'marketing',
    description: 'Drives campaigns, brand awareness, and conversion.',
    memberIds: ['m1'],
  },
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

const normalizeMemberIds = (memberIds) => {
  if (!Array.isArray(memberIds)) return [];
  return [...new Set(memberIds.map((memberId) => String(memberId)).filter(Boolean))];
};

const normalizeTeam = (team) => ({
  id: String(team.id),
  name: (team.name || '').trim(),
  type: isValidTeamType(team.type) ? team.type : DEFAULT_TEAM_TYPE,
  description: (team.description || '').trim(),
  memberIds: normalizeMemberIds(team.memberIds),
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
  } catch {
    // ignore malformed local storage
  }
  return defaultTeamMembers;
};

const loadInitialTeams = () => {
  try {
    const saved = localStorage.getItem('teams');
    const parsed = saved ? JSON.parse(saved) : defaultTeams;
    return parsed.map(normalizeTeam).filter((team) => team.name);
  } catch {
    return defaultTeams.map(normalizeTeam);
  }
};

const loadInitialProjects = (seedMembers) => {
  try {
    const saved = localStorage.getItem('projects');
    const parsedProjects = saved ? JSON.parse(saved) : defaultProjects;
    return parsedProjects.map((project) => normalizeProject(project, seedMembers));
  } catch {
    return defaultProjects.map((project) => normalizeProject(project, seedMembers));
  }
};

const buildInitialState = () => {
  const storedTeamMembers = loadInitialTeamMembers();
  const projects = loadInitialProjects(storedTeamMembers);
  const teams = loadInitialTeams();
  const projectMembers = getUniqueMembersFromProjects(projects);
  const memberMap = new Map();

  [...storedTeamMembers, ...projectMembers].forEach((member) => {
    const normalized = normalizeMember(member);
    if (!normalized.name.trim()) return;
    memberMap.set(normalized.id, normalized);
  });

  const teamMembers = [...memberMap.values()];
  const validMemberIds = new Set(teamMembers.map((member) => member.id));
  const sanitizedTeams = teams.map((team) => ({
    ...team,
    memberIds: team.memberIds.filter((memberId) => validMemberIds.has(memberId)),
  }));

  return { projects, teams: sanitizedTeams, teamMembers };
};

export function ProjectProvider({ children }) {
  const [initialState] = useState(buildInitialState);
  const [projects, setProjects] = useState(initialState.projects);
  const [teams, setTeams] = useState(initialState.teams);
  const [teamMembers, setTeamMembers] = useState(initialState.teamMembers);

  const [activities, setActivities] = useState([
    { id: 1, user: 'Alex', action: 'completed a task', target: 'Homepage Hero', time: '2h ago' },
    { id: 2, user: 'Sam', action: 'added a comment', target: 'Mobile Nav', time: '4h ago' },
    { id: 3, user: 'You', action: 'created a project', target: 'Marketing Campaign', time: '1d ago' },
    { id: 4, user: 'Alex', action: 'updated status', target: 'API Integration', time: '1d ago' },
  ]);

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem('teams', JSON.stringify(teams));
  }, [teams]);

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

  const addTeam = (teamData) => {
    const newTeam = normalizeTeam({
      id: Date.now().toString(),
      name: teamData.name,
      type: teamData.type,
      description: teamData.description,
      memberIds: [],
    });
    if (!newTeam.name) return null;
    setTeams((prev) => [newTeam, ...prev]);
    addActivity({ user: 'You', action: 'created team', target: newTeam.name });
    return newTeam;
  };

  const removeTeam = (teamId) => {
    setTeams((prev) => prev.filter((team) => team.id !== teamId));
  };

  const addMemberToTeam = (teamId, memberId) => {
    const normalizedMemberId = String(memberId || '');
    if (!normalizedMemberId) return;
    const memberExists = teamMembers.some((member) => member.id === normalizedMemberId);
    if (!memberExists) return;

    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) return team;
        if (team.memberIds.includes(normalizedMemberId)) return team;
        return { ...team, memberIds: [...team.memberIds, normalizedMemberId] };
      })
    );
  };

  const removeMemberFromTeam = (teamId, memberId) => {
    const normalizedMemberId = String(memberId || '');
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? { ...team, memberIds: team.memberIds.filter((id) => id !== normalizedMemberId) }
          : team
      )
    );
  };

  const removeTeamMember = (memberId) => {
    const normalizedMemberId = String(memberId || '');
    setTeamMembers((prev) => prev.filter((member) => member.id !== normalizedMemberId));
    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        members: project.members.filter((member) => member.id !== normalizedMemberId),
      }))
    );
    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        memberIds: team.memberIds.filter((id) => id !== normalizedMemberId),
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

  const value = {
    projects,
    teams,
    teamMembers,
    activities,
    addProject,
    deleteProject,
    addTeam,
    removeTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    addTeamMember,
    removeTeamMember,
    addMemberToProject,
    removeMemberFromProject,
    getMemberProjectCount,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
