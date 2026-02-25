import User from '../models/User.js';

export const getUsers = async (_req, res) => {
  try {
    const users = await User.find({}, 'name email role').sort({ name: 1 });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
