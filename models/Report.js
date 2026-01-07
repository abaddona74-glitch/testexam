import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
  },
  questionId: {
    type: String,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  user: {
    type: String, // Or Object if detailed user info is stored
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);
