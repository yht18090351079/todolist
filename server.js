const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static('.'));

// 飞书API代理
app.all('/api/feishu/*', async (req, res) => {
    try {
        const feishuUrl = `https://open.feishu.cn/open-apis${req.path.replace('/api/feishu', '')}`;
        
        const response = await fetch(feishuUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...req.headers.authorization && { 'Authorization': req.headers.authorization }
            },
            ...(req.body && Object.keys(req.body).length > 0) && { body: JSON.stringify(req.body) }
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('代理请求失败:', error);
        res.status(500).json({ error: '代理请求失败', message: error.message });
    }
});

// 豆包API代理
app.post('/api/doubao/chat', async (req, res) => {
    try {
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${req.body.apiKey}`
            },
            body: JSON.stringify({
                model: req.body.model,
                messages: req.body.messages
            })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('豆包API请求失败:', error);
        res.status(500).json({ error: '豆包API请求失败', message: error.message });
    }
});

// 默认路由返回index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📋 任务管理系统已启动`);
});