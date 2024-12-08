const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const UserService = require('./services/UserService');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();

// 中间件
app.use(express.json());
app.use(cors({
    origin: 'https://w3router.github.io',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin']
}));

// 数据库连接
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB connected');
        console.log('MongoDB URI:', process.env.MONGODB_URI);
        
        // 创建默认管理员账户
        try {
            const adminEmail = 'info@eon-protocol.com';
            const adminPassword = 'vijTo9-kehmet-cessis';
            console.log('Checking for admin account:', adminEmail);
            const existingAdmin = await User.findOne({ email: adminEmail });
            console.log('Existing admin check result:', existingAdmin);
            
            if (!existingAdmin) {
                console.log('Creating admin account...');
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                console.log('Password hashed');
                const admin = new User({
                    email: adminEmail,
                    password: hashedPassword,
                    isAdmin: true
                });
                console.log('Admin user object created:', admin);
                await admin.save();
                console.log('Default admin account created:', admin);
            } else {
                console.log('Admin account already exists:', existingAdmin);
            }
        } catch (error) {
            console.error('Error creating default admin (details):', error.stack);
            console.error('Error creating default admin:', error);
        }
        
        // 启动服务器
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);  // 如果数据库连接失败，退出进程
    });

// API 路由
app.post('/auth/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userId = await UserService.createUser(email, password);
        res.json({
            success: true,
            message: 'Registration successful',
            userId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 登录路由
app.post('/auth/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email, password });
        
        const user = await UserService.verifyUser(email, password);
        console.log('User found:', user);
        
        if (user) {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email
                }
            });
        } else {
            console.log('Authentication failed - no user found or password mismatch');
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
    } catch (error) {
        console.error('Login error details:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});