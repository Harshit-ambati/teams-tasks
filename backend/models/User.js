import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'project_manager', 'department_leader', 'team_leader', 'team_member'],
      default: 'team_member',
    },
    rsaPublicKey: {
      type: String,
      default: '',
      trim: true,
    },
    rsaKeyVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
