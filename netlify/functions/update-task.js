// Netlify Function - 更新任务
const https = require('https');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    BASE_URL: 'https://wcn0pu8598xr.feishu.cn/base/DPIqbB7OWa05ZZsiQi8cP1jnnBb',
    TABLE_ID: 'tblAyK0L5R7iuKWz'
};

// 获取访问令牌
async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        });

        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: '/open-apis/auth/v3/tenant_access_token/internal',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.code === 0) {
                        resolve(result.tenant_access_token);
                    } else {
                        reject(new Error(`获取访问令牌失败: ${result.msg}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 解析飞书URL获取app_token
function parseFeishuUrl(url) {
    const match = url.match(/\/base\/([a-zA-Z0-9]+)/);
    if (!match) {
        throw new Error('无法解析飞书表格URL');
    }
    return match[1];
}

// 更新任务
async function updateTask(accessToken, taskId, taskData) {
    return new Promise((resolve, reject) => {
        const appToken = parseFeishuUrl(FEISHU_CONFIG.BASE_URL);
        
        // 准备数据映射
        const fieldsData = {};
        if (taskData.title !== undefined) fieldsData['任务事项'] = taskData.title;
        if (taskData.project !== undefined) fieldsData['所属项目'] = taskData.project;
        if (taskData.assignee !== undefined) fieldsData['对接人'] = taskData.assignee;
        if (taskData.dueDate !== undefined) fieldsData['截止日期'] = taskData.dueDate;
        if (taskData.completed !== undefined) fieldsData['是否已完成'] = taskData.completed;

        const putData = JSON.stringify({
            fields: fieldsData
        });
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${taskId}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(putData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.code === 0) {
                        resolve(result.data);
                    } else {
                        reject(new Error(`更新任务失败: ${result.msg}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(putData);
        req.end();
    });
}

// 主函数
exports.handler = async (event, context) => {
    // 设置CORS头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // 处理OPTIONS请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // 只允许PUT请求
    if (event.httpMethod !== 'PUT') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        // 解析请求体
        const requestData = JSON.parse(event.body);
        const { taskId, ...taskData } = requestData;
        
        // 验证taskId
        if (!taskId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: '任务ID为必填字段' 
                })
            };
        }

        console.log('开始更新飞书任务:', taskId, taskData);
        
        // 获取访问令牌
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');
        
        // 更新任务
        const result = await updateTask(accessToken, taskId, taskData);
        console.log('✅ 任务更新成功');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result,
                message: '任务更新成功'
            })
        };
        
    } catch (error) {
        console.error('❌ 更新任务失败:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message
            })
        };
    }
};
