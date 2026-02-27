import mongoose from 'mongoose';

const readReceiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'file', 'voice'],
      default: 'text',
      required: true,
      index: true,
    },
    encryptedContent: {
      type: String,
      default: '',
      trim: true,
    },
    encryptedKeys: {
      type: Map,
      of: String,
      default: {},
    },
    iv: {
      type: String,
      default: '',
      trim: true,
    },
    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true,
    },
    fileUrl: {
      type: String,
      default: '',
      trim: true,
    },
    fileName: {
      type: String,
      default: '',
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    mimeType: {
      type: String,
      default: '',
      trim: true,
    },
    encryptedFileMetadata: {
      type: String,
      default: '',
      trim: true,
    },
    searchTokens: [
      {
        type: String,
        trim: true,
      },
    ],
    edited: {
      type: Boolean,
      default: false,
      index: true,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    readBy: [readReceiptSchema],
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

messageSchema.index({ chatRoomId: 1, createdAt: -1 });
messageSchema.index({ chatRoomId: 1, parentMessageId: 1, createdAt: 1 });
messageSchema.index({ chatRoomId: 1, senderId: 1, createdAt: -1 });
messageSchema.index({ searchTokens: 'text' });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
