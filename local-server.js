// 本地开发服务器 - 模拟Netlify Functions
const http = require('http');
const url = require('url');

const PORT = 3002;

// 模拟任务数据
let mockTasks = [
    {
        id: 'rec001',
        title: '跟进客户反馈意见',
        project: '新疆电网二期',
        assignee: '袁昊天',
        dueDate: '2024-12-08',
        createTime: '2024-12-01',
        completed: false,
        daysToDeadline: 4
    },
    {
        id: 'rec002',
        title: '准备下一季度销售计划',
        project: '地灾预警',
        assignee: '张三',
        dueDate: '2024-12-10',
        createTime: '2024-12-01',
        completed: false,
        daysToDeadline: 6
    },
    {
        id: 'rec003',
        title: '组织员工培训',
        project: '地灾预警',
        assignee: '李四',
        dueDate: '2024-12-15',
        createTime: '2024-12-01',
        completed: true,
        daysToDeadline: 11
    },
    {
        id: 'rec004',
        title: '完成系统测试',
        project: '新建电网二期',
        assignee: '王五',
        dueDate: '2024-12-08',
        createTime: '2024-12-02',
        completed: false,
        daysToDeadline: 4
    },
    {
        id: 'rec005',
        title: '项目验收准备',
        project: '地灾预警',
        assignee: '赵六',
        dueDate: '2024-12-20',
        createTime: '2024-12-03',
        completed: false,
        daysToDeadline: 16
    }
];

// 处理CORS
function setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 发送JSON响应
function sendJSON(res, statusCode, data) {
    setCORSHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// 获取请求体
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

// 创建服务器
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    console.log(`${method} ${path}`);

    // 处理OPTIONS请求
    if (method === 'OPTIONS') {
        setCORSHeaders(res);
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // 健康检查
        if (path === '/health' && method === 'GET') {
            sendJSON(res, 200, {
                success: true,
                data: {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    service: 'local-dev-server',
                    version: '1.0.0'
                }
            });
            return;
        }

        // 获取任务列表
        if (path === '/tasks' && method === 'GET') {
            console.log('✅ 返回任务列表，共', mockTasks.length, '条');
            sendJSON(res, 200, {
                success: true,
                tasks: mockTasks,
                source: 'local_dev'
            });
            return;
        }

        // 创建任务
        if (path === '/create-task' && method === 'POST') {
            const taskData = await getRequestBody(req);
            console.log('创建任务:', taskData);

            // 验证必填字段
            if (!taskData.title || !taskData.project) {
                sendJSON(res, 200, {
                    success: false,
                    message: '任务事项和所属项目为必填字段'
                });
                return;
            }

            // 创建新任务
            const newTask = {
                id: 'rec' + Date.now(),
                title: taskData.title,
                project: taskData.project,
                assignee: taskData.assignee || '',
                dueDate: taskData.dueDate || '',
                createTime: new Date().toISOString().split('T')[0],
                completed: taskData.completed || false,
                daysToDeadline: taskData.dueDate ? 
                    Math.ceil((new Date(taskData.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
            };

            mockTasks.push(newTask);
            console.log('✅ 任务创建成功:', newTask.id);

            sendJSON(res, 200, {
                success: true,
                data: { records: [{ record_id: newTask.id }] },
                message: '任务创建成功'
            });
            return;
        }

        // 更新任务
        if (path === '/update-task' && method === 'PUT') {
            const requestData = await getRequestBody(req);
            const { taskId, ...taskData } = requestData;
            console.log('更新任务:', taskId, taskData);

            // 查找任务
            const taskIndex = mockTasks.findIndex(task => task.id === taskId);
            if (taskIndex === -1) {
                sendJSON(res, 200, {
                    success: false,
                    message: '任务不存在'
                });
                return;
            }

            // 更新任务
            const task = mockTasks[taskIndex];
            if (taskData.title !== undefined) task.title = taskData.title;
            if (taskData.project !== undefined) task.project = taskData.project;
            if (taskData.assignee !== undefined) task.assignee = taskData.assignee;
            if (taskData.dueDate !== undefined) task.dueDate = taskData.dueDate;
            if (taskData.completed !== undefined) task.completed = taskData.completed;

            // 重新计算截止日期
            if (task.dueDate) {
                task.daysToDeadline = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
            }

            console.log('✅ 任务更新成功:', taskId);

            sendJSON(res, 200, {
                success: true,
                data: { record: task },
                message: '任务更新成功'
            });
            return;
        }

        // 404 - 路径不存在
        sendJSON(res, 404, {
            success: false,
            message: 'API路径不存在'
        });

    } catch (error) {
        console.error('❌ 服务器错误:', error);
        sendJSON(res, 500, {
            success: false,
            message: error.message
        });
    }
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`🚀 本地开发服务器启动成功`);
    console.log(`📍 地址: http://localhost:${PORT}`);
    console.log(`🔧 模拟Netlify Functions API`);
    console.log(`📋 可用端点:`);
    console.log(`   GET  /health - 健康检查`);
    console.log(`   GET  /tasks - 获取任务列表`);
    console.log(`   POST /create-task - 创建任务`);
    console.log(`   PUT  /update-task - 更新任务`);
    console.log('');
    console.log('💡 在另一个终端运行: python3 -m http.server 8000');
    console.log('   然后访问: http://localhost:8000');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});
