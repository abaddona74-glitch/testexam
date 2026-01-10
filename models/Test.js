import mongoose from 'mongoose';

const TestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  folder: {
    type: String,
    required: false,
    default: 'General'
  },
  content: {
    type: Object, // Changed from Array to Object to support { test_questions: [...] } structure
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Test || mongoose.model('Test', TestSchema);
