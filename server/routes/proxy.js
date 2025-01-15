const express = require('express');
const { validateApiKey } = require('../middleware/auth');
const router = express.Router();

console.log('[DEBUG] 初始化代理路由模块');

// 定义路由处理器
const handlers = {
  getNodeStats: (req, res) => {
    console.log('[DEBUG] 处理节点统计请求:', {
      deviceId: req.params.deviceId,
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      method: req.method,
      headers: req.headers
    });
    
    try {
      res.json({
        success: true,
        data: {
          deviceId: req.params.deviceId,
          uptime: Math.floor(Math.random() * 1000000),
          memory: {
            total: 8192,
            used: Math.floor(Math.random() * 8192)
          },
          cpu: {
            cores: 4,
            usage: Math.random()
          }
        }
      });
      console.log('[DEBUG] 节点统计响应成功');
    } catch (error) {
      console.error('[DEBUG] 节点统计处理错误:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  postNodeReport: (req, res) => {
    console.log('[DEBUG] 处理节点报告:', {
      body: req.body,
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      method: req.method,
      headers: req.headers
    });
    
    try {
      res.json({
        success: true,
        message: 'Report received'
      });
      console.log('[DEBUG] 节点报告响应成功');
    } catch (error) {
      console.error('[DEBUG] 节点报告处理错误:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// 注册路由
router.get('/nodes/:deviceId/stats', handlers.getNodeStats);
router.post('/nodes/report', handlers.postNodeReport);

// 导出路由器和处理器
module.exports = { router, handlers }; 