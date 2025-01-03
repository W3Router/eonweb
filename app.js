const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const { router: referralRoutes } = require('./routes/referral');
const tasksRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const pointsRoutes = require('./routes/points');

// Initialize Express app
const app = express();

// Application state
let isReady = false;
let dbConnected = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoints with detailed logging
app.get('/_ah/start', (req, res) => {
    console.log('[Health Check] Received start request');
    if (!isReady) {
        console.log('[Health Check] Application not ready yet');
        res.status(503).json({ status: 'initializing' });
        return;
    }
    res.status(200).send('OK');
});

app.get('/_ah/stop', (req, res) => {
    console.log('[Health Check] Received stop request');
    res.status(200).send('OK');
});

// Readiness probe
app.get('/_ah/ready', (req, res) => {
    console.log(`[Health Check] Readiness check - DB Connected: ${dbConnected}, App Ready: ${isReady}`);
    if (!isReady || !dbConnected) {
        res.status(503).json({
            ready: false,
            dbConnected,
            isReady
        });
        return;
    }
    res.status(200).json({ status: 'ready' });
});

// Static file service with readiness check
app.use((req, res, next) => {
    if (!isReady && !req.path.startsWith('/_ah/')) {
        console.log(`[Request] Rejected ${req.path} - Application not ready`);
        res.status(503).json({ status: 'initializing' });
        return;
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Root route with error handling
app.get('/', (req, res, next) => {
    if (!isReady) {
        res.status(503).json({ status: 'initializing' });
        return;
    }
    console.log('[Route] Serving index.html');
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, err => {
        if (err) {
            console.error('[Error] Failed to serve index.html:', err);
            next(err);
        } else {
            console.log('[Success] index.html served successfully');
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/points', pointsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[Error] Unhandled error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});

// Initialize application
async function startServer() {
    try {
        // First, connect to the database
        console.log('[Database] Connecting to database...');
        await sequelize.authenticate();
        console.log('[Database] Connection has been established successfully.');
        dbConnected = true;

        // Then start the server
        const port = process.env.PORT || 8081;
        const server = app.listen(port, () => {
            console.log(`[Server] Server is running on port ${port}`);
            // Mark application as ready
            isReady = true;
            console.log('[Server] Application is ready to handle requests');
        });

        // Handle graceful shutdown
        process.on('SIGTERM', () => {
            console.log('[Server] Received SIGTERM. Starting graceful shutdown...');
            isReady = false; // Mark as not ready to reject new requests
            server.close(async () => {
                console.log('[Server] Closing database connection...');
                await sequelize.close();
                console.log('[Server] Server and database connections closed.');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        console.error('[Startup] Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application
startServer();

module.exports = app;
