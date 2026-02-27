import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });

const Reaction = mongoose.models.Reaction || mongoose.model('Reaction', reactionSchema);

export default Reaction;
