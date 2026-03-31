import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'page_visit', 'test_start', 'test_complete', 'test_submit',
      'ai_request', 'chat_message', 'comment_post',
      'api_call', 'login_attempt', 'key_validate', 'key_generate',
      'test_upload', 'test_delete', 'report',
      'cheat_violation',
      'injection_attempt', 'dos_attempt', 'suspicious',
      'block_action', 'admin_action'
    ],
    required: true,
    index: true,
  },
  ip: {
    type: String,
    index: true,
  },
  userAgent: String,
  userId: String,
  userName: String,
  path: String,
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  },
  statusCode: Number,
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  country: String,
  city: String,
  region: String,
  deviceId: String,
  isSuspicious: {
    type: Boolean,
    default: false,
    index: true,
  },
  suspiciousReason: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// TTL: Auto-delete logs older than 90 days
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound indexes for common queries
ActivityLogSchema.index({ type: 1, createdAt: -1 });
ActivityLogSchema.index({ ip: 1, createdAt: -1 });
ActivityLogSchema.index({ isSuspicious: 1, createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
