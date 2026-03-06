const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt
const User = require('../models/User');
const router = express.Router();

// Get specific user details for editing
router.get('/users/:userId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ success: false, error: 'Invalid User ID format' });
        }
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.error('Fetch user details error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user details' });
    }
});

// Update specific user details
router.put('/users/:userId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ success: false, error: 'Invalid User ID format' });
        }

        const { displayName, email, role, password } = req.body;
        const updateData = {};

        if (displayName) updateData.displayName = displayName;
        if (email) {
            updateData.email = email;
            updateData.username = email; // Keep username synced with email
        }
        if (role) updateData.role = role;

        // Hash password if provided
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true }).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, user, message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Email/Username already in use' });
        }
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

module.exports = router;
