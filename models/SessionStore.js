import mongoose from 'mongoose';

const SessionStoreSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: String,
  name: String,
  ip: String,
  country: String,
  city: String,
  lat: Number,
  lng: String,
  gpsAccuracy: Number,
  locationSource: String,
  cameraStatus: String,
  cameraSnapshot: String,
  cameraUpdatedAt: Date,
  device: String,
  status: { type: String, default: 'browsing' },
  testId: String,
  difficulty: String,
  progress: Number,
  total: Number,
  stars: Number,
  theme: String,
  lastUpdated: { type: Date, default: Date.now },
  startedAt: Date,
  startedTestId: String,
}, {
  timestamps: false,
});

SessionStoreSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 300 });
SessionStoreSchema.index({ name: 1 });
SessionStoreSchema.index({ userId: 1 });

export default mongoose.models.SessionStore || mongoose.model('SessionStore', SessionStoreSchema);
