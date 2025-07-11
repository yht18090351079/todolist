// 飞书API相关函数
class FeishuAPI {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = 0;
        // 检查是否是Netlify环境
        this.isNetlify = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    }



    // 获取访问令牌
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await fetch(CONFIG.FEISHU.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_id: CONFIG.FEISHU.APP_ID,
                    app_secret: CONFIG.FEISHU.APP_SECRET
                })
            });

            const data = await response.json();
            
            if (data.code === 0) {
                this.accessToken = data.tenant_access_token;
                this.tokenExpiry = Date.now() + (data.expire - 300) * 1000; // 提前5分钟刷新
                return this.accessToken;
            } else {
                throw new Error(`获取访问令牌失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('获取访问令牌失败:', error);
            throw error;
        }
    }

    // 获取多维表格记录
    async getRecords(pageSize = 100, pageToken = '') {
        const token = await this.getAccessToken();
        const params = new URLSearchParams({
            page_size: pageSize.toString(),
            ...(pageToken && { page_token: pageToken })
        });

        const apiPath = `/bitable/v1/apps/${CONFIG.FEISHU.BITABLE_ID}/tables/${CONFIG.FEISHU.TABLE_ID}/records?${params}`;

        try {
            const response = await fetch(CONFIG.FEISHU.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    apiPath: apiPath,
                    method: 'GET'
                })
            });

            const data = await response.json();
            
            if (data.code === 0) {
                return data.data;
            } else {
                throw new Error(`获取记录失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('获取记录失败:', error);
            throw error;
        }
    }

    // 创建记录
    async createRecord(fields) {
        const token = await this.getAccessToken();
        const apiPath = `/bitable/v1/apps/${CONFIG.FEISHU.BITABLE_ID}/tables/${CONFIG.FEISHU.TABLE_ID}/records`;

        try {
            const response = await fetch(CONFIG.FEISHU.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    apiPath: apiPath,
                    method: 'POST',
                    data: {
                        fields: fields
                    }
                })
            });

            const data = await response.json();
            
            if (data.code === 0) {
                return data.data;
            } else {
                throw new Error(`创建记录失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('创建记录失败:', error);
            throw error;
        }
    }

    // 更新记录
    async updateRecord(recordId, fields) {
        const token = await this.getAccessToken();
        const apiPath = `/bitable/v1/apps/${CONFIG.FEISHU.BITABLE_ID}/tables/${CONFIG.FEISHU.TABLE_ID}/records/${recordId}`;

        try {
            const response = await fetch(CONFIG.FEISHU.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    apiPath: apiPath,
                    method: 'PUT',
                    data: {
                        fields: fields
                    }
                })
            });

            const data = await response.json();
            
            if (data.code === 0) {
                return data.data;
            } else {
                throw new Error(`更新记录失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('更新记录失败:', error);
            throw error;
        }
    }

    // 删除记录
    async deleteRecord(recordId) {
        const token = await this.getAccessToken();
        const apiPath = `/bitable/v1/apps/${CONFIG.FEISHU.BITABLE_ID}/tables/${CONFIG.FEISHU.TABLE_ID}/records/${recordId}`;

        try {
            const response = await fetch(CONFIG.FEISHU.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    apiPath: apiPath,
                    method: 'DELETE'
                })
            });

            const data = await response.json();
            
            if (data.code === 0) {
                return true;
            } else {
                throw new Error(`删除记录失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('删除记录失败:', error);
            throw error;
        }
    }

    // 获取表格字段信息
    async getTableFields() {
        const token = await this.getAccessToken();
        const apiPath = `/bitable/v1/apps/${CONFIG.FEISHU.BITABLE_ID}/tables/${CONFIG.FEISHU.TABLE_ID}/fields`;

        try {
            const response = await fetch(CONFIG.FEISHU.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    apiPath: apiPath,
                    method: 'GET'
                })
            });

            const data = await response.json();
            
            if (data.code === 0) {
                return data.data;
            } else {
                throw new Error(`获取字段信息失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('获取字段信息失败:', error);
            throw error;
        }
    }
}

// 豆包AI API相关函数
class DoubaoAPI {
    constructor() {
        this.apiKey = CONFIG.DOUBAO.API_KEY;
        this.baseUrl = CONFIG.DOUBAO.BASE_URL;
        this.model = CONFIG.DOUBAO.MODEL;
    }

    async generateReport(tasks, reportType = 'daily') {
        const prompt = this.createReportPrompt(tasks, reportType);
        
        try {
            const response = await fetch(CONFIG.DOUBAO.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: CONFIG.DOUBAO.API_KEY,
                    model: CONFIG.DOUBAO.MODEL,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                throw new Error('生成报告失败');
            }
        } catch (error) {
            console.error('调用豆包API失败:', error);
            throw error;
        }
    }

    createReportPrompt(tasks, reportType) {
        const today = new Date().toLocaleDateString('zh-CN');
        const reportTitle = reportType === 'daily' ? '日报' : '周报';
        
        let tasksSummary = '';
        const projects = {};
        
        tasks.forEach(task => {
            const project = task.fields[FIELD_MAPPING.PROJECT] || '未分类';
            if (!projects[project]) {
                projects[project] = [];
            }
            projects[project].push(task);
        });

        for (const [project, projectTasks] of Object.entries(projects)) {
            tasksSummary += `\n项目：${project}\n`;
            projectTasks.forEach(task => {
                const taskName = task.fields[FIELD_MAPPING.TASK_NAME] || '未命名任务';
                const status = task.fields[FIELD_MAPPING.STATUS] || '未知状态';
                const priority = task.fields[FIELD_MAPPING.PRIORITY] || '未知优先级';
                tasksSummary += `- ${taskName} (状态: ${status}, 优先级: ${priority})\n`;
            });
        }

        return `请帮我生成一份${reportTitle}，时间：${today}

任务情况：${tasksSummary}

请按以下格式输出：
1. 工作概述
2. 已完成任务
3. 进行中任务
4. 遇到的问题
5. 明天/下周计划

要求：
- 语言简洁专业
- 突出重点工作
- 提及项目进展
- 总结经验教训`;
    }
}