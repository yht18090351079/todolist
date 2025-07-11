// 飞书任务管理API集成模块
class FeishuTaskAPI {
    constructor() {
        // 飞书配置 - 根据要求.txt中的信息
        this.config = {
            APP_ID: 'cli_a8d4bd05dbf8100b',
            APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
            // 从要求.txt中的URL解析出的信息
            BASE_URL: 'https://wcn0pu8598xr.feishu.cn/base/DPIqbB7OWa05ZZsiQi8cP1jnnBb',
            TABLE_ID: 'tblAyK0L5R7iuKWz', // 从URL中提取的table ID
            VIEW_ID: 'vewM1Y9Vem' // 从URL中提取的view ID
        };
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    // 获取访问令牌
    async getAccessToken() {
        try {
            // 检查是否有有效的令牌
            if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return { success: true, token: this.accessToken };
            }

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

            const data = await response.json();

            if (data.code === 0) {
                this.accessToken = data.tenant_access_token;
                this.tokenExpiry = Date.now() + (data.expire - 300) * 1000; // 提前5分钟过期
                console.log('✅ 访问令牌获取成功');
                return { success: true, token: this.accessToken };
            } else {
                throw new Error(`获取访问令牌失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ 获取飞书访问令牌失败:', error);
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

    // 获取表格字段信息
    async getTableFields() {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const urlInfo = this.parseFeishuUrl(this.config.BASE_URL);
            if (!urlInfo.success) {
                return urlInfo;
            }

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${this.config.TABLE_ID}/fields`;

            const response = await fetch(proxyUrl + targetUrl, {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (data.code === 0) {
                console.log('✅ 获取表格字段成功');
                return { success: true, fields: data.data.items };
            } else {
                throw new Error(`获取字段信息失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ 获取飞书表格字段失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取任务记录
    async getTasks() {
        try {
            const tokenResult = await this.getAccessToken();
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
            console.error('❌ 获取飞书任务记录失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 创建新任务
    async createTask(taskData) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const urlInfo = this.parseFeishuUrl(this.config.BASE_URL);
            if (!urlInfo.success) {
                return urlInfo;
            }

            console.log('创建新任务:', taskData);

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

            const result = await response.json();
            console.log('飞书API响应:', result);

            if (result.code === 0) {
                console.log('✅ 任务创建成功');
                return { success: true, data: result.data };
            } else {
                throw new Error(`创建任务失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('❌ 创建飞书任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 更新任务
    async updateTask(taskId, taskData) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const urlInfo = this.parseFeishuUrl(this.config.BASE_URL);
            if (!urlInfo.success) {
                return urlInfo;
            }

            console.log('更新任务:', taskId, taskData);

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

            const result = await response.json();
            console.log('飞书API响应:', result);

            if (result.code === 0) {
                console.log('✅ 任务更新成功');
                return { success: true, data: result.data };
            } else {
                throw new Error(`更新任务失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('❌ 更新飞书任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 删除任务
    async deleteTask(taskId) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const urlInfo = this.parseFeishuUrl(this.config.BASE_URL);
            if (!urlInfo.success) {
                return urlInfo;
            }

            console.log('删除任务:', taskId);

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${this.config.TABLE_ID}/records/${taskId}`;

            const response = await fetch(proxyUrl + targetUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json();
            console.log('飞书API响应:', result);

            if (result.code === 0) {
                console.log('✅ 任务删除成功');
                return { success: true };
            } else {
                throw new Error(`删除任务失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('❌ 删除飞书任务失败:', error);
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
