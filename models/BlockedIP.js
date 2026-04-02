import mongoose from 'mongoose';

const BlockedIPSchema = new mongoose.Schema({
  ip: {
    type: String,
    index: true,
  },
  deviceId: {
    type: String,
    index: true,
  },
  userName: {
    type: String,
    index: true,
  },
  reason: {
    type: String,
    required: true,
  },
  blockedBy: {
    type: String,
    default: 'admin',
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    default: null, // null = permanent
  },
  blockedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes
BlockedIPSchema.index({ ip: 1, isActive: 1 });
BlockedIPSchema.index({ deviceId: 1, isActive: 1 });
BlockedIPSchema.index({ userName: 1, isActive: 1 });

export default mongoose.models.BlockedIP || mongoose.model('BlockedIP', BlockedIPSchema);
