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
    credentials: true
}));
app.use(express.json());
app.use(express.static('./')); // 服务根目录文件
app.use('/public', express.static('public')); // 服务 public 目录

// 路由处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 认证相关路由
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth', 'login.html')); // 直接跳转到登录页
});

app.get('/auth/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth', 'login.html'));
});

app.get('/auth/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'index.html'));
});

// API 路由
app.post('/auth/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserService.verifyUser(email, password);
        
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
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 数据库连接
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
