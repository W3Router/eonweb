// Load environment variables based on NODE_ENV
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });
console.log('Loading environment from:', envFile);

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const sequelize = require('./config/database');
const { User, Task, UserTask, PointHistory, Settings } = require('./models');
const authRoutes = require('./routes/auth');
const { router: referralRoutes } = require('./routes/referral');
const tasksRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const { authenticateToken, isAdmin } = require('./middleware/auth');
const crypto = require('crypto');

const app = express();

// 中间件
const corsOptions = {
    origin: [
        'http://localhost:8080',
        'http://localhost:3000',
        'https://eonhome-445809.et.r.appspot.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    if (req.headers.authorization) {
        console.log('Authorization header present');
    }
    next();
});

// Error logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Serve static files first
app.use(express.static(path.join(__dirname, 'public')));

// Public routes (no authentication required)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// API routes
app.use('/api/auth', authRoutes);

// Protected API routes with authentication
app.use('/api', authenticateToken);
app.use('/api/referral', referralRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/stats', statsRoutes);

// Admin routes with both authentication and admin check
app.use('/api/admin', authenticateToken, isAdmin, adminRoutes);

// Health check endpoints for App Engine (no authentication required)
app.get('/_ah/health', (req, res) => {
    console.log('Received health check request');
    res.status(200).send('OK');
});

app.get('/_ah/start', async (req, res) => {
    console.log('Received App Engine start request');
    try {
        // Basic health check
        await sequelize.authenticate();
        console.log('Database connection successful');
        res.status(200).send('OK');
    } catch (error) {
        console.error('Health check failed:', error);
        console.error('Error stack:', error.stack);
        // Return 200 to prevent continuous restarts
        res.status(200).send('Starting with errors');
    }
});

app.get('/_ah/stop', async (req, res) => {
    console.log('Received App Engine stop request');
    try {
        await gracefulShutdown();
        res.status(200).send('OK');
    } catch (error) {
        console.error('Stop request failed:', error);
        res.status(200).send('Stopping with errors');
    }
});

// Handle frontend routing (no authentication required)
// This must be the last route
app.get('*', (req, res) => {
    // Don't handle API routes here
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Seed tasks
async function seedTasks() {
    console.log('Seeding tasks...');
    try {
        // Delete existing tasks
        await Task.destroy({ where: {} });

        // Create tasks
        const tasks = [
            {
                title: 'Referral Reward',
                description: 'Invite new users to join the platform',
                points: 100,
                type: 'one-time',
                requirements: ['Invite a new user'],
                verificationMethod: 'automatic',
                isActive: true,
                status: 'active',
                startDate: new Date()
            },
            {
                title: 'Share Bandwidth',
                description: 'Share bandwidth to earn rewards',
                points: 20,
                type: 'daily',
                requirements: ['Share minimum 1GB bandwidth'],
                verificationMethod: 'automatic',
                isActive: true,
                status: 'active',
                startDate: new Date()
            }
        ];

        for (const task of tasks) {
            const createdTask = await Task.create(task);
            console.log(`Created task: ${createdTask.title}`);
        }

        console.log('Tasks seeded successfully');
    } catch (error) {
        console.error('Error seeding tasks:', error);
    }
}

// Graceful shutdown function
async function gracefulShutdown() {
    console.log('Starting graceful shutdown...');
    let exitCode = 0;

    try {
        // Close HTTP server first
        const server = app.get('server');
        if (server) {
            console.log('Closing HTTP server...');
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        console.error('Error closing HTTP server:', err);
                        reject(err);
                    } else {
                        console.log('HTTP server closed successfully');
                        resolve();
                    }
                });
            });
        }

        // Then close database connection
        if (sequelize) {
            console.log('Closing database connection...');
            await sequelize.close();
            console.log('Database connection closed successfully');
        }

        console.log('Graceful shutdown completed successfully');
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        exitCode = 1;
    }

    // Only exit if not handling App Engine stop request
    if (!process.env.GAE_VERSION) {
        process.exit(exitCode);
    }
}

// Initialize database and start server
async function initializeApp() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection established');

        // Sync database
        await sequelize.sync();
        console.log('Database synchronized');

        // Create admin user if not exists
        console.log('Checking for admin user...');
        const adminEmail = 'info@eon-protocol.com';
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });

        if (!existingAdmin) {
            console.log('Creating admin user...');
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            const hashedPassword = await bcryptjs.hash(adminPassword, 10);
            const referralCode = crypto.randomBytes(4).toString('hex');

            await User.create({
                email: adminEmail,
                password: hashedPassword,
                isAdmin: true,
                points: 0,
                referralCode
            });
            console.log('Admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }

        // Seed tasks
        console.log('Starting task seeding...');
        await seedTasks();
        console.log('Tasks seeded successfully');

        // Start server
        const PORT = process.env.PORT || 8081;
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Store server instance
        app.set('server', server);
        console.log('Server instance stored in app');

        // Handle graceful shutdown signals
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`${signal} signal received`);
                await gracefulShutdown();
            });
        });
        console.log('Signal handlers registered');

        return server;
    } catch (error) {
        console.error('Application initialization failed:', error);
        console.error('Error stack:', error.stack);
        process.exit(1);
    }
}

// Start the application
initializeApp().catch(error => {
    console.error('Failed to start application:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
    console.error('Error stack:', error.stack);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
});

module.exports = app;
