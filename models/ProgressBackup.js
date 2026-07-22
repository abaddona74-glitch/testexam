import mongoose from 'mongoose';

const ProgressBackupSchema = new mongoose.Schema({
  phone: {
    type: String,
    default: undefined,
  },
  email: {
    type: String,
    default: undefined,
  },
  progress: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  userName: {
    type: String,
    default: '',
  },
  userId: {
    type: String,
    default: '',
  },
  contactType: {
    type: String,
    enum: ['phone', 'email'],
    default: 'phone',
  },
  verifiedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ProgressBackupSchema.index({ phone: 1 }, { unique: true, sparse: true });
ProgressBackupSchema.index({ email: 1 }, { unique: true, sparse: true });

ProgressBackupSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ProgressBackup || mongoose.model('ProgressBackup', ProgressBackupSchema);
