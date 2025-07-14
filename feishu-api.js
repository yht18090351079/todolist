// 飞书任务管理API - 使用代理服务器
class FeishuTaskAPI {
    constructor() {
        // 代理服务器地址
        this.proxyUrl = window.location.origin.includes('localhost')
            ? 'http://localhost:3002'
            : window.location.origin + '/.netlify/functions';
        console.log('🔧 飞书API代理URL:', this.proxyUrl);
    }

    // 获取访问令牌（兼容性方法）
    async getAccessToken() {
        // 代理模式下不需要前端获取令牌
        return { success: true, token: 'proxy_mode' };
    }

    // 获取任务记录
    async getTasks() {
        try {
            console.log('从代理服务器获取任务数据...');

            const response = await fetch(`${this.proxyUrl}/tasks`);
            const result = await response.json();

            if (result.success) {
                console.log('✅ 获取任务记录成功，共', result.tasks.length, '条');
                if (result.source === 'fallback') {
                    console.log('⚠️ 使用备用数据，原因:', result.error);
                }
                return { success: true, tasks: result.tasks };
            } else {
                throw new Error(result.message || '获取任务失败');
            }
        } catch (error) {
            console.error('❌ 获取任务失败:', error);

            // 返回本地备用数据
            const fallbackTasks = [
                {
                    id: 'local_1',
                    title: '跟进客户反馈意见',
                    project: '新疆电网二期',
                    assignee: '袁昊天',
                    dueDate: '2024-12-08',
                    createTime: '2024-12-01',
                    completed: false,
                    daysToDeadline: 4
                },
                {
                    id: 'local_2',
                    title: '准备下一季度销售计划',
                    project: '地灾预警',
                    assignee: '张三',
                    dueDate: '2024-12-10',
                    createTime: '2024-12-01',
                    completed: false,
                    daysToDeadline: 6
                },
                {
                    id: 'local_3',
                    title: '组织员工培训',
                    project: '地灾预警',
                    assignee: '李四',
                    dueDate: '2024-12-15',
                    createTime: '2024-12-01',
                    completed: true,
                    daysToDeadline: 11
                },
                {
                    id: 'local_4',
                    title: '完成系统测试',
                    project: '新建电网二期',
                    assignee: '王五',
                    dueDate: '2024-12-08',
                    createTime: '2024-12-02',
                    completed: false,
                    daysToDeadline: 4
                },
                {
                    id: 'local_5',
                    title: '项目验收准备',
                    project: '地灾预警',
                    assignee: '赵六',
                    dueDate: '2024-12-20',
                    createTime: '2024-12-03',
                    completed: false,
                    daysToDeadline: 16
                }
            ];

            console.log('✅ 使用本地备用数据，共', fallbackTasks.length, '条');
            return { success: true, tasks: fallbackTasks, source: 'local_fallback', error: error.message };
        }
    }



    // 创建新任务
    async createTask(taskData) {
        try {
            console.log('开始创建新任务到飞书...');
            console.log('任务数据:', JSON.stringify(taskData, null, 2));

            const response = await fetch(`${this.proxyUrl}/create-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            console.log('HTTP响应状态:', response.status);
            console.log('HTTP响应OK:', response.ok);

            const result = await response.json();
            console.log('API响应结果:', result);

            if (result.success) {
                console.log('✅ 任务创建成功');
                console.log('记录ID:', result.data?.records?.[0]?.record_id);
                return { success: true, data: result.data };
            } else {
                console.error('❌ API返回失败:', result);
                throw new Error(result.message || result.error || '创建任务失败');
            }
        } catch (error) {
            console.error('❌ 创建任务失败:', error);
            return { success: false, error: error.message };
        }
    }



    // 更新任务
    async updateTask(taskId, taskData) {
        try {
            console.log('开始更新任务到飞书...');
            console.log('任务ID:', taskId);
            console.log('更新数据:', JSON.stringify(taskData, null, 2));

            const response = await fetch(`${this.proxyUrl}/update-task`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskId, ...taskData })
            });

            console.log('HTTP响应状态:', response.status);
            console.log('HTTP响应OK:', response.ok);

            const result = await response.json();
            console.log('API响应结果:', result);

            if (result.success) {
                console.log('✅ 任务更新成功');
                return { success: true, data: result.data };
            } else {
                console.error('❌ API返回失败:', result);
                throw new Error(result.message || result.error || '更新任务失败');
            }
        } catch (error) {
            console.error('❌ 更新任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 保存报告到飞书表格
    async saveReport(reportData) {
        try {
            console.log('📝 开始保存报告到飞书表格...');
            console.log('报告数据:', reportData);

            const response = await fetch(`${this.proxyUrl}/save-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            console.log('HTTP响应状态:', response.status);
            console.log('HTTP响应OK:', response.ok);

            const result = await response.json();
            console.log('API响应结果:', result);

            if (result.success) {
                console.log('✅ 报告保存成功');
                return { success: true, data: result.data };
            } else {
                console.error('❌ API返回失败:', result);
                throw new Error(result.message || result.error || '保存报告失败');
            }
        } catch (error) {
            console.error('❌ 保存报告失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 健康检查
    async checkHealth() {
        try {
            const response = await fetch(`${this.proxyUrl}/health`);
            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取项目列表（从任务中提取唯一项目）
    async getProjects() {
        try {
            const tasksResult = await this.getTasks();
            if (!tasksResult.success) {
                return tasksResult;
            }

            const projects = [...new Set(tasksResult.tasks.map(task => task.project).filter(p => p))];
            return { success: true, projects: projects };
        } catch (error) {
            console.error('❌ 获取项目列表失败:', error);
            return { success: false, error: error.message };
        }
    }
}

// 创建全局实例
window.feishuTaskAPI = new FeishuTaskAPI();
console.log('✅ 飞书任务管理API代理模块已加载');