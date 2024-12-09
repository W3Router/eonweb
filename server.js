const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const UserService = require('./services/UserService');

const app = express();

// 中间件
app.use(cors({
    origin: 'https://w3router.github.io',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

// 在 mongoose.connect 之后添加默认管理员账户
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB connected');
        
        // 创建默认管理员账户
        try {
            const adminEmail = 'info@eon-protocol.com';
            const adminPassword = 'vijTo9-kehmet-cessis';
            const existingAdmin = await UserService.findUserByEmail(adminEmail);
            
            if (!existingAdmin) {
                await UserService.createUser(adminEmail, adminPassword, true); // true 表示是管理员
                console.log('Default admin account created');
            }
        } catch (error) {
            console.error('Error creating default admin:', error);
        }
        
        // 启动服务器
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })

// 登录路由
app.post('/auth/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });
        
        const user = await UserService.verifyUser(email, password);
        
        if (user) {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    isAdmin: user.isAdmin
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 获取推荐信息
app.get('/api/user/referral', async (req, res) => {
    try {
        // 从 token 中获取用户 ID
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const stats = await UserService.getReferralStats(decoded.userId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 生成新的推荐码
app.post('/api/user/referral/generate', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const referral = await UserService.generateReferralCode(decoded.userId);
        res.json(referral);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});