import mongoose from 'mongoose';

const messageHistorySchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    previousType: {
      type: String,
      enum: ['text', 'file', 'voice'],
      default: 'text',
    },
    previousEncryptedContent: {
      type: String,
      default: '',
      trim: true,
    },
    previousEncryptedKeys: {
      type: Map,
      of: String,
      default: {},
    },
    previousIv: {
      type: String,
      default: '',
      trim: true,
    },
    previousEncryptedFileMetadata: {
      type: String,
      default: '',
      trim: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const MessageHistory =
  mongoose.models.MessageHistory || mongoose.model('MessageHistory', messageHistorySchema);

export default MessageHistory;
