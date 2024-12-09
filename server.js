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
            const adminEmail = 'admin@eonprotocol.com';
            const adminPassword = 'admin123';
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