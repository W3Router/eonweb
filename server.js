const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();
const UserService = require('./services/UserService');
const User = require('./models/User');
const TaskService = require('./services/TaskService');
const Task = require('./models/Task');

const app = express();

// 请求调试日志 - 放在最前面
app.use((req, res, next) => {
    console.log('\n=== Incoming Request ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Origin:', req.headers.origin);
    console.log('Headers:', req.headers);
    next();
});

// 响应调试日志
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(...args) {
        console.log('\n=== Outgoing Response ===');
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.getHeaders());
        return originalSend.apply(res, args);
    };
    next();
});

// 基础配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置正确的 MIME 类型
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// 静态文件服务配置
const staticOptions = {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
    }
};

console.log('Setting up static file serving from:', path.join(__dirname));
app.use(express.static(path.join(__dirname), staticOptions));
app.use('/public', express.static(path.join(__dirname, 'public'), staticOptions));

// 添加调试日志中间件
app.use((req, res, next) => {
    console.log(`\n=== Incoming Request ===`);
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Railway environment configuration
const RAILWAY_PRIVATE_DOMAIN = process.env.RAILWAY_PRIVATE_DOMAIN || 'illustrious-perfection.railway.internal';
const RAILWAY_SERVICE_NAME = process.env.RAILWAY_SERVICE_NAME || 'illustrious-perfection';
const RAILWAY_ENVIRONMENT = process.env.RAILWAY_ENVIRONMENT_NAME || 'production';

console.log('\n=== Railway Configuration ===');
console.log('- Private Domain:', RAILWAY_PRIVATE_DOMAIN);
console.log('- Service Name:', RAILWAY_SERVICE_NAME);
console.log('- Environment:', RAILWAY_ENVIRONMENT);

// MongoDB connection configuration
const MONGOHOST = process.env.MONGOHOST || 'mongodb.railway.internal';
const MONGOPORT = process.env.MONGOPORT || '27017';
const MONGOUSER = process.env.MONGOUSER || 'mongo';
const MONGOPASSWORD = process.env.MONGOPASSWORD || 'sUgcrMBkbeKekzBDqEQnqfOOCHjDNAbq';

// Construct MongoDB URL using Railway private domain
const MONGO_URL = `mongodb://${MONGOUSER}:${MONGOPASSWORD}@${MONGOHOST}:${MONGOPORT}`;

console.log('\n=== MongoDB Configuration ===');
console.log('- Host:', MONGOHOST);
console.log('- Port:', MONGOPORT);
console.log('- User:', MONGOUSER);
console.log('- Connection URL:', MONGO_URL.replace(/mongodb:\/\/.*@/, 'mongodb://[credentials]@'));

// CORS 配置
const corsOptions = {
    origin: ['http://localhost:3000', 'https://illustrious-perfection-production.up.railway.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log('\n=== Server Configuration ===');
console.log('- PORT:', PORT);
console.log('- HOST:', HOST);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Working Directory:', process.cwd());

const server = app.listen(PORT, HOST, () => {
    console.log('\n=== Server Started ===');
    console.log(`Server is running at http://${HOST}:${PORT}`);
    
    // 打印所有注册的路由
    console.log('\n=== Registered Routes ===');
    const routes = app._router.stack
        .filter(r => r.route)
        .map(r => ({
            path: r.route.path,
            methods: Object.keys(r.route.methods)
        }));
    console.log(JSON.stringify(routes, null, 2));
    
    // 打印中间件信息
    console.log('\n=== Middleware Stack ===');
    app._router.stack
        .filter(r => !r.route)
        .forEach(r => {
            console.log(`- ${r.name || 'anonymous'}`);
        });
});

mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    directConnection: true,
    authSource: 'admin'
})
.then(() => {
    console.log('Successfully connected to MongoDB');
})
.catch((err) => {
    console.error('MongoDB connection error:', {
        name: err.name,
        message: err.message,
        code: err.code,
        host: MONGOHOST,
        port: MONGOPORT
    });
});

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// 初始化数据
async function initializeData() {
    try {
        // 检查并创建管理员账户
        const adminEmail = 'info@eon-protocol.com';
        const adminPassword = 'vijTo9-kehmet-cessis';
        
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const admin = new User({
                email: adminEmail,
                password: hashedPassword,
                isAdmin: true
            });
            await admin.save();
            console.log('Default admin account created');
        }

        // 初始化默认任务
        await initializeTasks();
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// 初始化默认任务
async function initializeTasks() {
    try {
        const defaultTasks = [
            {
                title: 'Bandwidth Sharing',
                description: 'Share bandwidth to support AI data crawling',
                points: 100,
                type: 'daily',
                requirements: 'Stable internet connection',
                isActive: true,
                status: 'Coming Soon'
            },
            {
                title: 'Data Validation',
                description: 'Help validate and improve AI training data quality',
                points: 50,
                type: 'daily',
                requirements: 'Basic understanding of data quality',
                isActive: true,
                status: 'Coming Soon'
            },
            {
                title: 'Referral Program',
                description: 'Invite new users to join EON Protocol. Earn 100 points for each referral when they use your referral code (50 points without referral code). New users also receive 100 points. Daily limit: 10 referrals.',
                points: 100,
                type: 'daily',
                requirements: 'Complete email verification and pass reCAPTCHA verification',
                isActive: true,
                status: 'Active',
                dailyLimit: 10,
                basePoints: 50,
                bonusPoints: 50
            }
        ];

        for (const taskData of defaultTasks) {
            const existingTask = await Task.findOne({ title: taskData.title });
            if (!existingTask) {
                const task = new Task(taskData);
                await task.save();
                console.log(`Default task created: ${taskData.title}`);
            } else {
                await Task.findOneAndUpdate(
                    { title: taskData.title },
                    { $set: taskData },
                    { new: true }
                );
                console.log(`Default task updated: ${taskData.title}`);
            }
        }
    } catch (error) {
        console.error('Error initializing tasks:', error);
    }
}

// 测试用户设置
const TEST_USER = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
};

// 认证 API 路由
app.post('/api/auth/login', async (req, res) => {
    console.log('\n=== Login Request ===');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    
    try {
        const { email, password } = req.body;
        
        // 为测试用户提供模拟认证
        if (email === TEST_USER.email && password === TEST_USER.password) {
            const token = 'test-token-' + Date.now();
            console.log('Login successful for test user');
            
            res.json({
                token,
                user: {
                    email: TEST_USER.email,
                    name: TEST_USER.name
                }
            });
        } else {
            console.log('Login failed: Invalid credentials');
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/user', async (req, res) => {
    console.log('\n=== Get User Info Request ===');
    console.log('Headers:', req.headers);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Unauthorized: No token provided');
        return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token received:', token);
    
    // 为测试用户提供模拟数据
    if (token.startsWith('test-token-')) {
        console.log('Returning test user info');
        res.json({
            email: TEST_USER.email,
            name: TEST_USER.name,
            tasks: [],
            referrals: []
        });
    } else {
        console.log('Invalid token');
        res.status(401).json({ message: 'Invalid token' });
    }
});

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    try {
        await new Promise((resolve) => {
            server.close(resolve);
        });
        console.log('Server closed. Disconnecting from database...');
        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// 中间件：验证JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// 中间件：验证管理员权限
const isAdmin = async (req, res, next) => {
    try {
        const user = await UserService.findById(req.user.userId);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Admin privileges required' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 用户管理路由
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await UserService.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/users/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const stats = await UserService.getUserStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/users/:userId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await UserService.updateUser(req.params.userId, req.body);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/users/:userId', authenticateToken, isAdmin, async (req, res) => {
    try {
        await UserService.deleteUser(req.params.userId);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 任务管理路由
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = req.user.isAdmin ? 
            await TaskService.getAllTasks() : 
            await TaskService.getAvailableTasks();
        res.json(tasks);
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/tasks/:taskId/toggle', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await TaskService.toggleTaskStatus(taskId);
        res.json(task);
    } catch (error) {
        console.error('Error toggling task status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/tasks', authenticateToken, isAdmin, async (req, res) => {
    try {
        const taskId = await TaskService.createTask(req.body);
        res.status(201).json({ id: taskId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/tasks/:taskId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const success = await TaskService.updateTask(req.params.taskId, req.body);
        if (success) {
            res.json({ message: 'Task updated successfully' });
        } else {
            res.status(404).json({ message: 'Task not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/tasks/:taskId', authenticateToken, isAdmin, async (req, res) => {
    try {
        await TaskService.deleteTask(req.params.taskId);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/tasks/:taskId/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const stats = await TaskService.getTaskStats(req.params.taskId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 用户任务路由
app.post('/api/tasks/:taskId/start', authenticateToken, async (req, res) => {
    try {
        await TaskService.startTask(req.user.userId, req.params.taskId);
        res.json({ message: 'Task started successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/tasks/:taskId/complete', authenticateToken, async (req, res) => {
    try {
        const { pointsEarned } = req.body;
        await TaskService.completeTask(req.user.userId, req.params.taskId, pointsEarned);
        res.json({ message: 'Task completed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/user/tasks', authenticateToken, async (req, res) => {
    try {
        const history = await TaskService.getUserTaskHistory(req.user.userId);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 推荐系统路由
app.get('/api/user/referrals', authenticateToken, async (req, res) => {
    try {
        const referralInfo = await UserService.getUserReferrals(req.user.userId);
        res.json(referralInfo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 获取当前用户信息
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await UserService.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ message: error.message });
    }
});

// 获取用户推荐信息
app.get('/api/users/referral-info', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 获取该用户推荐的用户数量
        const totalReferrals = await User.countDocuments({ referredBy: user._id });

        // 获取推荐相关的积分历史
        const referralPoints = await PointHistory.aggregate([
            {
                $match: {
                    userId: user._id,
                    type: 'referral'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$points' }
                }
            }
        ]);

        res.json({
            referralCode: user.referralCode,
            totalReferrals,
            referralPoints: referralPoints[0]?.total || 0
        });
    } catch (error) {
        console.error('Error getting referral info:', error);
        res.status(500).json({ message: 'Error getting referral information' });
    }
});

// 获取推荐任务状态
app.get('/api/tasks/referral/status', async (req, res) => {
    try {
        const referralTask = await Task.findOne({ title: 'Referral Program' });
        res.json({ isActive: referralTask ? referralTask.isActive : false });
    } catch (error) {
        console.error('Error getting referral task status:', error);
        res.status(500).json({ message: 'Error getting referral task status' });
    }
});

// 切换任务状态（需要管理员权限）
app.put('/api/tasks/:taskId/toggle', authenticateToken, isAdmin, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // 切换状态
        task.isActive = !task.isActive;
        await task.save();

        res.json({ message: 'Task status updated', task });
    } catch (error) {
        console.error('Error toggling task status:', error);
        res.status(500).json({ message: 'Error updating task status' });
    }
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 调试中间件
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});