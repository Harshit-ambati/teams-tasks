import mongoose from 'mongoose';

const projectTeamSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    teamLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const ProjectTeam =
  mongoose.models.ProjectTeam || mongoose.model('ProjectTeam', projectTeamSchema);

export default ProjectTeam;
