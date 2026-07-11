import mongoose from 'mongoose';

const ProgressBackupSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true,
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
  verifiedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ProgressBackupSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ProgressBackup || mongoose.model('ProgressBackup', ProgressBackupSchema);
