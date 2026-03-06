const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Mood = require('../models/Mood');
const Activity = require('../models/Activity');
const router = express.Router();

// Get user dashboard data
router.get('/:userId/dashboard', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ success: false, error: 'Invalid User ID format' });
        }
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get recent activities (last 10)
        const activities = await Activity.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .select('activity mood type createdAt')
            .lean();

        // Get mood history (all)
        const moodHistory = await Mood.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .select('mood notes createdAt')
            .lean();

        // Calculate start of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Get mood specific to TODAY
        const todaysMoodEntry = await Mood.findOne({
            userId: req.params.userId,
            createdAt: { $gte: startOfToday }
        }).sort({ createdAt: -1 });

        const moodToday = todaysMoodEntry ? todaysMoodEntry.mood : null;

        // Get tasks completed TODAY
        const tasksCompletedToday = await Activity.countDocuments({
            userId: req.params.userId,
            type: 'task',
            activity: 'Completed a task',
            createdAt: { $gte: startOfToday }
        });

        res.json({
            success: true,
            user: {
                id: user._id,
                customId: user.customId,
                displayName: user.displayName,
                email: user.email || user.username,
                contact: user.contact,
                bio: user.bio,
                location: user.location,
                jobTitle: user.jobTitle,
                role: user.role,
                currentMood: moodToday, // Strict daily reset: if no mood today, return null
                tasksCompleted: tasksCompletedToday, // Annual reset effectively (daily count)
                lifetimeTasks: user.tasksCompleted, // Keep lifetime available
                currentProject: user.currentProject,
                moodToday: moodToday // Explicit field
            },
            activities: activities.map(act => ({
                ...act,
                time: new Date(act.createdAt).toLocaleTimeString()
            })),
            moodHistory,
            summary: {
                totalMoods: moodHistory.length,
                totalActivities: activities.length
            }
        });

    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data',
            message: error.message
        });
    }
});

// Log mood
router.post('/:userId/mood', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ success: false, error: 'Invalid User ID format' });
        }
        const { mood, notes } = req.body;

        if (!mood) {
            return res.status(400).json({
                success: false,
                error: 'Mood is required'
            });
        }

        // Create mood entry
        const moodEntry = new Mood({
            mood,
            notes: notes || '',
            userId: req.params.userId
        });
        await moodEntry.save();

        // Update user's current mood
        await User.findByIdAndUpdate(req.params.userId, {
            currentMood: mood
        });

        // Create activity entry and emit
        const activity = new Activity({
            activity: `Logged mood: ${mood}`,
            mood: mood,
            type: 'mood',
            userId: req.params.userId
        });
        await activity.save();

        const user = await User.findById(req.params.userId);

        // Emit via socket.io
        const io = req.app.get('io');
        io.to('admin-room').emit('new-activity', {
            ...activity.toObject(),
            userDisplayName: user ? user.displayName : 'Unknown User',
            time: new Date().toLocaleTimeString()
        });

        console.log(`📊 Mood logged: ${mood} for user ${req.params.userId}`);

        res.json({
            success: true,
            mood: moodEntry,
            message: 'Mood logged successfully'
        });

    } catch (error) {
        console.error('Log mood error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log mood',
            message: error.message
        });
    }
});

// Log activity - ADD THIS MISSING ROUTE!
router.post('/:userId/activity', async (req, res) => {
    try {
        const { activity, mood, type } = req.body;

        if (!activity) {
            return res.status(400).json({
                success: false,
                error: 'Activity description is required'
            });
        }

        const activityEntry = new Activity({
            activity,
            mood: mood || null,
            type: type || 'system',
            userId: req.params.userId
        });
        await activityEntry.save();

        const user = await User.findById(req.params.userId);

        // Emit via socket.io
        const io = req.app.get('io');
        io.to('admin-room').emit('new-activity', {
            ...activityEntry.toObject(),
            userDisplayName: user ? user.displayName : 'Unknown User',
            time: new Date().toLocaleTimeString()
        });

        console.log(`📝 Activity logged: ${activity} for user ${req.params.userId}`);

        res.json({
            success: true,
            activity: activityEntry,
            message: 'Activity logged successfully'
        });

    } catch (error) {
        console.error('Log activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log activity',
            message: error.message
        });
    }
});

// Increment tasks completed
router.post('/:userId/complete-task', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        user.tasksCompleted += 1;
        await user.save();

        // Log activity
        const activity = new Activity({
            activity: 'Completed a task',
            type: 'task',
            userId: user._id
        });
        await activity.save();

        res.json({
            success: true,
            tasksCompleted: user.tasksCompleted
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update tasks count' });
    }
});

// Decrement tasks completed (uncomplete)
router.post('/:userId/uncomplete-task', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        user.tasksCompleted = Math.max(0, (user.tasksCompleted || 0) - 1);
        await user.save();

        // Log activity
        const activity = new Activity({
            activity: 'Moved task back to progress',
            type: 'task',
            userId: user._id
        });
        await activity.save();

        res.json({
            success: true,
            tasksCompleted: user.tasksCompleted
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update tasks count' });
    }
});

// Update current project
router.put('/:userId/project', async (req, res) => {
    try {
        const { project } = req.body;
        // If specific project name is passed, use it (legacy behavior support)
        // But more importantly, if we are auto-syncing:

        let newProjectString = project;

        // Auto-calculate if requested
        if (req.body.autoSync) {
            const inProgressTasks = await require('../models/Task').find({
                userId: req.params.userId,
                column: 'inprogress'
            }).select('title');

            if (inProgressTasks.length > 0) {
                newProjectString = inProgressTasks.map(t => t.title).join(', ');
            } else {
                newProjectString = '';
            }
        }

        const user = await User.findByIdAndUpdate(req.params.userId, { currentProject: newProjectString }, { new: true });

        // Log activity if it changed meaningfully
        if (newProjectString) {
            const activity = new Activity({
                activity: `Working on: ${newProjectString}`,
                type: 'work',
                userId: req.params.userId
            });
            await activity.save();

            // Emit via socket.io
            const io = req.app.get('io');
            io.to('admin-room').emit('new-activity', {
                ...activity.toObject(),
                userDisplayName: user.displayName,
                time: new Date().toLocaleTimeString()
            });
        }

        res.json({ success: true, project: user.currentProject });
    } catch (error) {
        console.error("Project sync error", error);
        res.status(500).json({ success: false, error: 'Failed to update project' });
    }
});

// Get mood history
router.get('/:userId/mood-history', async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const moodHistory = await Mood.find({
            userId: req.params.userId,
            createdAt: { $gte: startDate }
        })
            .sort({ createdAt: -1 })
            .select('mood notes createdAt')
            .lean();

        res.json({
            success: true,
            moodHistory,
            period: `${days} days`
        });

    } catch (error) {
        console.error('Get mood history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch mood history',
            message: error.message
        });
    }
});

// Update user profile
router.put('/:userId/profile', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ success: false, error: 'Invalid User ID format' });
        }
        const { displayName, email, contact, bio, location, jobTitle } = req.body;

        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (email !== undefined) updateData.email = email;
        if (contact !== undefined) updateData.contact = contact;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;
        if (jobTitle !== undefined) updateData.jobTitle = jobTitle;

        console.log(`Updating profile for user ${req.params.userId}:`, updateData);

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Log activity
        const activity = new Activity({
            activity: 'Updated profile information',
            type: 'profile',
            userId: user._id
        });
        await activity.save();

        res.json({
            success: true,
            user: {
                id: user._id,
                customId: user.customId,
                displayName: user.displayName,
                email: user.email || user.username,
                contact: user.contact,
                bio: user.bio,
                location: user.location,
                jobTitle: user.jobTitle,
                avatar: user.avatar,
                role: user.role
            },
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            message: error.message
        });
    }
});

// GET all activities for ADMIN
router.get('/admin/all-activities', async (req, res) => {
    try {
        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('userId', 'displayName email role avatar')
            .lean();

        res.json({
            success: true,
            activities: activities.map(act => ({
                ...act,
                userDisplayName: act.userId ? act.userId.displayName : 'Deleted User',
                time: new Date(act.createdAt).toLocaleTimeString()
            }))
        });
    } catch (error) {
        console.error('Admin fetch activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch all activities' });
    }
});

// GET all users for ADMIN with Today's Live Stats
router.get('/admin/all-users', async (req, res) => {
    try {
        const users = await User.find({}, '-password').lean();

        // Enhance user objects with daily stats
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const enhancedUsers = await Promise.all(users.map(async (u) => {
            // Only enhance non-admins for performance if needed, or all
            // Get today's mood
            const todaysMoodEntry = await Mood.findOne({
                userId: u._id,
                createdAt: { $gte: startOfToday }
            }).sort({ createdAt: -1 });

            // Get today's tasks
            const tasksToday = await Activity.countDocuments({
                userId: u._id,
                type: 'task',
                activity: 'Completed a task',
                createdAt: { $gte: startOfToday }
            });

            return {
                ...u,
                id: u._id,
                currentMood: todaysMoodEntry ? todaysMoodEntry.mood : null,
                tasksCompletedToday: tasksToday,
                tasksCompleted: tasksToday, // Overriding for front-end compatibility with existing fields
                lifetimeTasks: u.tasksCompleted
            };
        }));

        res.json({ success: true, users: enhancedUsers });
    } catch (error) {
        console.error('Admin Fetch Users Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});
// GET aggregated mood distribution for ADMIN (all historical moods)
router.get('/admin/all-moods', async (req, res) => {
    try {
        const moodAggregation = await Mood.aggregate([
            {
                $group: {
                    _id: '$mood',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Convert aggregation result to a simple object
        const moodCounts = { happy: 0, neutral: 0, stressed: 0, angry: 0, relieved: 0 };
        moodAggregation.forEach(entry => {
            if (moodCounts.hasOwnProperty(entry._id)) {
                moodCounts[entry._id] = entry.count;
            }
        });

        const totalMoods = Object.values(moodCounts).reduce((sum, c) => sum + c, 0);

        res.json({
            success: true,
            moodCounts,
            totalMoods
        });
    } catch (error) {
        console.error('Admin fetch all moods error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch mood distribution' });
    }
});

module.exports = router;
