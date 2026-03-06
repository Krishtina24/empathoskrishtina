const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Activity = require('../models/Activity');
const router = express.Router();

// REGISTER
router.post('/signup', async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate Custom ID
    const prefix = (role === 'Admin' || role === 'admin') ? 'ADM' : 'USR';
    const lastUserWithPrefix = await User.findOne({ customId: { $regex: new RegExp(`^${prefix}-`) } }).sort({ createdAt: -1 });
    let nextId = `${prefix}-001`;

    if (lastUserWithPrefix && lastUserWithPrefix.customId) {
      const lastIdParts = lastUserWithPrefix.customId.split('-');
      if (lastIdParts.length === 2) {
        const lastIdNum = parseInt(lastIdParts[1]);
        if (!isNaN(lastIdNum)) {
          nextId = `${prefix}-${String(lastIdNum + 1).padStart(3, '0')}`;
        }
      }
    }

    // Create user
    user = new User({
      username,
      password: hashedPassword,
      displayName: displayName || username.split('@')[0],
      email: username, // Automatically set email to username
      role: role || 'Employee',
      customId: nextId
    });

    await user.save();

    // Log Activity
    const activity = new Activity({
      activity: `New user joined as ${user.role}: ${user.displayName}`,
      type: 'profile',
      userId: user._id
    });
    await activity.save();

    // Emit via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('new-activity', {
        ...activity.toObject(),
        userDisplayName: user.displayName,
        time: new Date().toLocaleTimeString()
      });
    }

    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        customId: user.customId,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    // Check Role Consistency
    if (role && user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You are registered as ${user.role}. Please use the ${user.role} login option.`
      });
    }

    // Log Activity
    const activity = new Activity({
      activity: `User logged in`,
      type: 'system',
      userId: user._id
    });
    await activity.save();

    // Emit via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('new-activity', {
        ...activity.toObject(),
        userDisplayName: user.displayName,
        time: new Date().toLocaleTimeString()
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        customId: user.customId,
        username: user.username,
        email: user.email || user.username, // Ensure email is present
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        currentMood: user.currentMood,
        tasksCompleted: user.tasksCompleted,
        currentProject: user.currentProject
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;