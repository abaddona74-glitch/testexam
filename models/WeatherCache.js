import mongoose from 'mongoose';

const WeatherCacheSchema = new mongoose.Schema({
  cacheKey: {
    type: String,
    required: true,
    unique: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

WeatherCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7200 });

export default mongoose.models.WeatherCache || mongoose.model('WeatherCache', WeatherCacheSchema);