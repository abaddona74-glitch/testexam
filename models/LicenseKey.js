import mongoose from 'mongoose';

const LicenseKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active',
  },
  type: {
    type: String,
    enum: ['weekly', 'monthly', 'unlimited'],
    default: 'weekly',
  },
  usedBy: {
    type: String, // Store the userId or DeviceId of the whoever used it
    default: null
  },
  activatedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.LicenseKey || mongoose.model('LicenseKey', LicenseKeySchema);
