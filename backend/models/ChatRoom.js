import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['private', 'team', 'project', 'global', 'ai'],
      required: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

chatRoomSchema.index({ type: 1, projectId: 1 }, { unique: true, partialFilterExpression: { type: 'project' } });
chatRoomSchema.index({ type: 1, teamId: 1 }, { unique: true, partialFilterExpression: { type: 'team' } });
chatRoomSchema.index({ type: 1 }, { unique: true, partialFilterExpression: { type: 'global' } });
chatRoomSchema.index({ members: 1 });
chatRoomSchema.index({ type: 1, members: 1 });

const ChatRoom = mongoose.models.ChatRoom || mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;
