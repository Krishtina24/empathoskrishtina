const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  email: { type: String, default: '' },
  contact: { type: String, default: '' },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  avatar: { type: String, default: '' },
  currentMood: { type: String, default: null },
  tasksCompleted: { type: Number, default: 0 },
  currentProject: { type: String, default: '' },
  customId: { type: String, unique: true },
  role: { type: String, default: 'Employee', enum: ['Employee', 'Manager', 'Admin'] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);