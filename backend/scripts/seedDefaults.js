import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import ProjectTeam from '../models/ProjectTeam.js';
import Task from '../models/Task.js';

dotenv.config();

const DEFAULT_PASSWORD = 'password123';

const ensureUser = async ({ name, email, role }) => {
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return User.create({
    name,
    email,
    role,
    password: hashedPassword,
  });
};

const ensureTeam = async ({ name, description, owner, members }) => {
  const existing = await Team.findOne({ name, owner });
  if (existing) return existing;

  return Team.create({
    name,
    description,
    owner,
    members,
  });
};

const ensureProject = async ({ title, description, status, owner, team }) => {
  const existing = await Project.findOne({ title, owner });
  if (existing) return existing;

  return Project.create({
    title,
    description,
    status,
    owner,
    team,
  });
};

const ensureProjectTeam = async ({ projectId, members, teamLeader }) => {
  const existing = await ProjectTeam.findOne({ projectId });
  if (existing) {
    existing.members = members;
    existing.teamLeader = teamLeader;
    await existing.save();
    return existing;
  }

  return ProjectTeam.create({
    projectId,
    members,
    teamLeader,
  });
};

const ensureTask = async ({
  title,
  description,
  status,
  priority,
  dueDate,
  project,
  team,
  assignedTo,
  createdBy,
}) => {
  const existing = await Task.findOne({ title, project });
  if (existing) return existing;

  return Task.create({
    title,
    description,
    status,
    priority,
    dueDate,
    project,
    team,
    assignedTo,
    createdBy,
  });
};

const seedDefaults = async () => {
  const admin = await ensureUser({
    name: 'Default Admin',
    email: 'admin@example.com',
    role: 'admin',
  });

  const projectManager = await ensureUser({
    name: 'Default Project Manager',
    email: 'pm@example.com',
    role: 'project_manager',
  });

  const teamLeader = await ensureUser({
    name: 'Default Team Leader',
    email: 'leader@example.com',
    role: 'team_leader',
  });

  const teamMemberA = await ensureUser({
    name: 'Default Team Member A',
    email: 'membera@example.com',
    role: 'team_member',
  });

  const teamMemberB = await ensureUser({
    name: 'Default Team Member B',
    email: 'memberb@example.com',
    role: 'team_member',
  });

  const engineeringTeam = await ensureTeam({
    name: 'Engineering Core Team',
    description: 'Primary engineering unit for delivery and platform initiatives.',
    owner: projectManager._id,
    members: [teamLeader._id, teamMemberA._id, teamMemberB._id],
  });

  const productTeam = await ensureTeam({
    name: 'Product Ops Team',
    description: 'Cross-functional planning and process management team.',
    owner: projectManager._id,
    members: [teamLeader._id, teamMemberA._id],
  });

  const crmProject = await ensureProject({
    title: 'Enterprise CRM Revamp',
    description: 'Modernize CRM workflows and improve internal sales operations.',
    status: 'active',
    owner: projectManager._id,
    team: engineeringTeam._id,
  });

  const analyticsProject = await ensureProject({
    title: 'Analytics Platform Rollout',
    description: 'Launch centralized reporting platform for all departments.',
    status: 'planning',
    owner: admin._id,
    team: productTeam._id,
  });

  await ensureProjectTeam({
    projectId: crmProject._id,
    members: [teamLeader._id, teamMemberA._id, teamMemberB._id],
    teamLeader: teamLeader._id,
  });

  await ensureProjectTeam({
    projectId: analyticsProject._id,
    members: [teamLeader._id, teamMemberA._id],
    teamLeader: teamLeader._id,
  });

  const now = new Date();
  const plusDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await ensureTask({
    title: 'Design CRM schema migration',
    description: 'Prepare migration plan and validation scripts for CRM entities.',
    status: 'in-progress',
    priority: 'high',
    dueDate: plusDays(7),
    project: crmProject._id,
    team: engineeringTeam._id,
    assignedTo: teamLeader._id,
    createdBy: projectManager._id,
  });

  await ensureTask({
    title: 'Implement contact timeline module',
    description: 'Build timeline APIs and integrate with frontend task board.',
    status: 'todo',
    priority: 'medium',
    dueDate: plusDays(14),
    project: crmProject._id,
    team: engineeringTeam._id,
    assignedTo: teamMemberA._id,
    createdBy: projectManager._id,
  });

  await ensureTask({
    title: 'Define KPI dashboard requirements',
    description: 'Collect stakeholder requirements and draft data contract.',
    status: 'todo',
    priority: 'medium',
    dueDate: plusDays(10),
    project: analyticsProject._id,
    team: productTeam._id,
    assignedTo: teamMemberB._id,
    createdBy: admin._id,
  });

  await ensureTask({
    title: 'Set up data ingestion pipeline',
    description: 'Create ingestion jobs for event and transactional datasets.',
    status: 'todo',
    priority: 'high',
    dueDate: plusDays(21),
    project: analyticsProject._id,
    team: productTeam._id,
    assignedTo: teamLeader._id,
    createdBy: admin._id,
  });

  console.log('Default users, teams, projects, and tasks seeded successfully.');
  console.log(`Default user password: ${DEFAULT_PASSWORD}`);
};

const run = async () => {
  try {
    await connectDB();
    await seedDefaults();
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

run();
