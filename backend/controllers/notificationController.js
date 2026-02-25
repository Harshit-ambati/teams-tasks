import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { message, type, relatedEntity, userId } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const notification = await Notification.create({
      message,
      type,
      relatedEntity,
      userId: userId || req.user.id,
      isRead: false,
    });

    return res.status(201).json(notification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    return res.status(200).json(notification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
