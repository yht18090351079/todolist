// 飞书API相关函数 - 改进版本
class FeishuAPI {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = 0;
        // 检查是否是Netlify环境
        this.isNetlify = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        // 添加CORS代理作为备用方案
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/';
        this.useCorsProxy = false;
    }

    // 智能API调用 - 支持多种方式
    async callFeishuAPI(apiPath, method = 'GET', data = null) {
        // 方案1: 优先使用Netlify Functions
        if (this.isNetlify && !this.useCorsProxy) {
            try {
                return await this.callViaNetlifyFunctions(apiPath, method, data);
            } catch (error) {
                console.warn('Netlify Functions失败，切换到CORS代理:', error.message);
                this.useCorsProxy = true;
            }
        }

        // 方案2: 使用CORS代理
        return await this.callViaCorsProxy(apiPath, method, data);
    }

    // 通过Netlify Functions调用
    async callViaNetlifyFunctions(apiPath, method, data) {
        const token = await this.getAccessToken();
        const response = await fetch(CONFIG.FEISHU.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                apiPath: apiPath,
                method: method,
                data: data
            })
        });

        if (!response.ok) {
            throw new Error(`Netlify Functions调用失败: ${response.status}`);
        }

        return await response.json();
    }

    // 通过CORS代理调用
    async callViaCorsProxy(apiPath, method, data) {
        const token = await this.getAccessToken();
        const url = `${this.corsProxy}https://open.feishu.cn/open-apis${apiPath}`;

        const requestOptions = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        if (data && method !== 'GET') {
            requestOptions.body = JSON.stringify(data);
        }

        const response = await fetch(url, requestOptions);
        return await response.json();
    }



    // 获取访问令牌 - 改进版本
    async getAccessToken() {
        // 检查缓存的令牌是否仍然有效
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            console.log('✅ 使用缓存的访问令牌');
            return this.accessToken;
        }

        console.log('🔄 获取新的访问令牌...');

        try {
            let response, data;

            // 方案1: 优先使用Netlify Functions
            if (this.isNetlify && !this.useCorsProxy) {
                try {
                    response = await fetch(CONFIG.FEISHU.TOKEN_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            app_id: CONFIG.FEISHU.APP_ID,
                            app_secret: CONFIG.FEISHU.APP_SECRET
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    data = await response.json();
                } catch (error) {
                    console.warn('Netlify Functions获取令牌失败，切换到CORS代理:', error.message);
                    this.useCorsProxy = true;
                }
            }

            // 方案2: 使用CORS代理
            if (this.useCorsProxy || !this.isNetlify) {
                const proxyUrl = `${this.corsProxy}https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal`;

                response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        app_id: CONFIG.FEISHU.APP_ID,
                        app_secret: CONFIG.FEISHU.APP_SECRET
                    })
                });

                data = await response.json();
            }

            if (data && data.code === 0) {
                this.accessToken = data.tenant_access_token;
                this.tokenExpiry = Date.now() + (data.expire - 300) * 1000; // 提前5分钟刷新
                console.log('✅ 访问令牌获取成功');
                return this.accessToken;
            } else {
                throw new Error(`获取访问令牌失败: ${data?.msg || '未知错误'}`);
            }
        } catch (error) {
            console.error('❌ 获取访问令牌失败:', error);
            throw error;
        }
    }

    // 获取多维表格记录 - 改进版本
    async getRecords(pageSize = 100, pageToken = '') {
        const params = new URLSearchParams({
            page_size: pageSize.toString(),
            ...(pageToken && { page_token: pageToken })
        });

        const apiPath = `/bitable/v1/apps/${CONFIG.FEISHU.BITABLE_ID}/tables/${CONFIG.FEISHU.TABLE_ID}/records?${params}`;

        try {
            console.log('🔄 获取表格记录...');
            const data = await this.callFeishuAPI(apiPath, 'GET');
            
            if (data.code === 0) {
                console.log('✅ 表格记录获取成功');
                return data.data;
            } else {
                throw new Error(`获取记录失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ 获取记录失败:', error);
            throw error;
        }
    }

    // 创建记录 - 改进版本
    async createRecord(fields) {
        const apiPath = `/bitable/v1/apps/${CONFIG.FEISHU.BITABLE_ID}/tables/${CONFIG.FEISHU.TABLE_ID}/records`;

        try {
            console.log('🔄 创建新记录...', fields);
            const data = await this.callFeishuAPI(apiPath, 'POST', { fields: fields });
            
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