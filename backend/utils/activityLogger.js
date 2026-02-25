import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';

export const createAuditLog = async ({
  action,
  entityType,
  entityId = null,
  performedBy,
  metadata = null,
}) => {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error(`Audit log failed: ${error.message}`);
  }
};

export const createNotification = async ({
  message,
  type = 'info',
  userId,
  relatedEntity = { entityType: null, entityId: null },
}) => {
  try {
    await Notification.create({
      message,
      type,
      userId,
      relatedEntity,
      isRead: false,
    });
  } catch (error) {
    console.error(`Notification failed: ${error.message}`);
  }
};
