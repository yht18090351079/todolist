// 飞书任务管理API集成模块 - 代理模式
class FeishuTaskAPI {
    constructor() {
        // 代理服务器地址配置
        this.proxyUrl = this.getProxyUrl();

        // 飞书配置 - 根据要求.txt中的信息
        this.config = {
            APP_ID: 'cli_a8d4bd05dbf8100b',
            APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
            BASE_URL: 'https://wcn0pu8598xr.feishu.cn/base/DPIqbB7OWa05ZZsiQi8cP1jnnBb',
            TABLE_ID: 'tblAyK0L5R7iuKWz',
            VIEW_ID: 'vewM1Y9Vem'
        };

        // 是否使用代理模式
        this.useProxy = true;

        console.log('🔧 飞书API代理URL:', this.proxyUrl);
    }

    // 获取代理URL
    getProxyUrl() {
        if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
            // 本地开发环境
            return 'http://localhost:3002';
        } else {
            // 生产环境使用Netlify Functions
            return window.location.origin + '/.netlify/functions';
        }
    }

    // 获取访问令牌（代理模式下不需要前端获取）
    async getAccessToken() {
        if (this.useProxy) {
            // 代理模式下不需要前端获取令牌
            return { success: true, token: 'proxy_mode' };
        }

        // 备用的直接模式（如果需要的话）
        return this.getAccessTokenDirect();
    }

    // 直接获取访问令牌（备用方案）
    async getAccessTokenDirect() {
        try {
            console.log('获取飞书访问令牌...');

            // 使用CORS代理
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

            const response = await fetch(proxyUrl + targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    app_id: this.config.APP_ID,
                    app_secret: this.config.APP_SECRET
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.code === 0) {
                console.log('✅ 访问令牌获取成功');
                return { success: true, token: data.tenant_access_token };
            } else {
                throw new Error(`获取访问令牌失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ 获取飞书访问令牌失败:', error);

            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                const corsMessage = `CORS代理访问受限。请按以下步骤操作：

1. 点击这个链接: https://cors-anywhere.herokuapp.com/corsdemo
2. 点击 "Request temporary access to the demo server" 按钮
3. 等待几秒钟后重新尝试同步数据

这是因为CORS代理服务需要临时激活才能使用。`;
                return { success: false, error: corsMessage };
            }

            return { success: false, error: error.message };
        }
    }

    // 解析飞书URL获取app_token
    parseFeishuUrl(url) {
        try {
            const match = url.match(/\/base\/([a-zA-Z0-9]+)/);
            if (!match) {
                throw new Error('无法解析飞书表格URL');
            }

            return {
                success: true,
                appToken: match[1]
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取任务记录
    async getTasks() {
        try {
            if (this.useProxy) {
                return await this.getTasksViaProxy();
            } else {
                return await this.getTasksDirect();
            }
        } catch (error) {
            console.error('❌ 获取飞书任务记录失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 通过代理获取任务
    async getTasksViaProxy() {
        try {
            console.log('通过代理获取任务数据...');

            const response = await fetch(`${this.proxyUrl}/tasks`);

            if (!response.ok) {
                throw new Error(`代理服务器错误: ${response.status} ${response.statusText}`);
            }

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
            console.error('❌ 代理获取任务失败:', error);
            // 如果代理失败，尝试直接模式
            console.log('尝试切换到直接模式...');
            this.useProxy = false;
            return await this.getTasksDirect();
        }
    }

    // 直接获取任务（备用方案）
    async getTasksDirect() {
        try {
            const tokenResult = await this.getAccessTokenDirect();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const urlInfo = this.parseFeishuUrl(this.config.BASE_URL);
            if (!urlInfo.success) {
                return urlInfo;
            }

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${this.config.TABLE_ID}/records`;

            const response = await fetch(proxyUrl + targetUrl, {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.code === 0) {
                console.log('✅ 获取任务记录成功，共', data.data.items.length, '条');

                // 转换数据格式以匹配前端需求
                const tasks = data.data.items.map(record => {
                    const fields = record.fields;
                    return {
                        id: record.record_id,
                        title: fields['任务事项'] || '',
                        project: fields['所属项目'] || '',
                        assignee: fields['对接人'] || '',
                        dueDate: fields['截止日期'] || '',
                        createTime: fields['创建时间'] || '',
                        completed: fields['是否已完成'] || false,
                        daysToDeadline: fields['距离截止日'] || 0
                    };
                });

                return { success: true, tasks: tasks };
            } else {
                throw new Error(`获取任务记录失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ 直接获取任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 创建新任务
    async createTask(taskData) {
        try {
            if (this.useProxy) {
                return await this.createTaskViaProxy(taskData);
            } else {
                return await this.createTaskDirect(taskData);
            }
        } catch (error) {
            console.error('❌ 创建飞书任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 通过代理创建任务
    async createTaskViaProxy(taskData) {
        try {
            console.log('通过代理创建新任务:', taskData);

            const response = await fetch(`${this.proxyUrl}/create-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (!response.ok) {
                throw new Error(`代理服务器错误: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log('✅ 任务创建成功');
                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || '创建任务失败');
            }
        } catch (error) {
            console.error('❌ 代理创建任务失败:', error);
            // 如果代理失败，尝试直接模式
            console.log('尝试切换到直接模式...');
            this.useProxy = false;
            return await this.createTaskDirect(taskData);
        }
    }

    // 直接创建任务（备用方案）
    async createTaskDirect(taskData) {
        try {
            const tokenResult = await this.getAccessTokenDirect();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const urlInfo = this.parseFeishuUrl(this.config.BASE_URL);
            if (!urlInfo.success) {
                return urlInfo;
            }

            console.log('直接创建新任务:', taskData);

            // 准备数据映射
            const fieldsData = {
                '任务事项': taskData.title,
                '所属项目': taskData.project,
                '对接人': taskData.assignee || '',
                '截止日期': taskData.dueDate || '',
                '是否已完成': taskData.completed || false
            };

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${this.config.TABLE_ID}/records`;

            const response = await fetch(proxyUrl + targetUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    records: [{ fields: fieldsData }]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.code === 0) {
                console.log('✅ 任务创建成功');
                return { success: true, data: result.data };
            } else {
                throw new Error(`创建任务失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('❌ 直接创建任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 更新任务
    async updateTask(taskId, taskData) {
        try {
            if (this.useProxy) {
                return await this.updateTaskViaProxy(taskId, taskData);
            } else {
                return await this.updateTaskDirect(taskId, taskData);
            }
        } catch (error) {
            console.error('❌ 更新飞书任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 通过代理更新任务
    async updateTaskViaProxy(taskId, taskData) {
        try {
            console.log('通过代理更新任务:', taskId, taskData);

            const response = await fetch(`${this.proxyUrl}/update-task`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskId, ...taskData })
            });

            if (!response.ok) {
                throw new Error(`代理服务器错误: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log('✅ 任务更新成功');
                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || '更新任务失败');
            }
        } catch (error) {
            console.error('❌ 代理更新任务失败:', error);
            // 如果代理失败，尝试直接模式
            console.log('尝试切换到直接模式...');
            this.useProxy = false;
            return await this.updateTaskDirect(taskId, taskData);
        }
    }

    // 直接更新任务（备用方案）
    async updateTaskDirect(taskId, taskData) {
        try {
            const tokenResult = await this.getAccessTokenDirect();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const urlInfo = this.parseFeishuUrl(this.config.BASE_URL);
            if (!urlInfo.success) {
                return urlInfo;
            }

            console.log('直接更新任务:', taskId, taskData);

            // 准备数据映射
            const fieldsData = {};
            if (taskData.title !== undefined) fieldsData['任务事项'] = taskData.title;
            if (taskData.project !== undefined) fieldsData['所属项目'] = taskData.project;
            if (taskData.assignee !== undefined) fieldsData['对接人'] = taskData.assignee;
            if (taskData.dueDate !== undefined) fieldsData['截止日期'] = taskData.dueDate;
            if (taskData.completed !== undefined) fieldsData['是否已完成'] = taskData.completed;

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${this.config.TABLE_ID}/records/${taskId}`;

            const response = await fetch(proxyUrl + targetUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    fields: fieldsData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.code === 0) {
                console.log('✅ 任务更新成功');
                return { success: true, data: result.data };
            } else {
                throw new Error(`更新任务失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('❌ 直接更新任务失败:', error);
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
console.log('✅ 飞书任务管理API模块已加载');