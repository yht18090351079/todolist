// Netlify Function - 创建新任务
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

// 创建任务
async function createTask(accessToken, taskData) {
    return new Promise((resolve, reject) => {
        const appToken = parseFeishuUrl(FEISHU_CONFIG.BASE_URL);
        
        // 准备数据映射
        const fieldsData = {
            '任务事项': taskData.title,
            '所属项目': taskData.project,
            '对接人': taskData.assignee || '',
            '是否已完成': taskData.completed || false
        };

        // 处理日期字段 - 只有当日期不为空时才设置
        if (taskData.dueDate && taskData.dueDate !== '') {
            try {
                const dateObj = new Date(taskData.dueDate);
                if (!isNaN(dateObj.getTime())) {
                    fieldsData['截止日期'] = dateObj.getTime();
                }
            } catch (error) {
                console.warn('日期格式转换失败:', taskData.dueDate, error);
            }
        }

        const postData = JSON.stringify({
            records: [{ fields: fieldsData }]
        });
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
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
                        resolve(result.data);
                    } else {
                        reject(new Error(`创建任务失败: ${result.msg}`));
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

    // 只允许POST请求
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        // 解析请求体
        let taskData;
        try {
            taskData = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error('❌ 请求体解析失败:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: '请求数据格式错误'
                })
            };
        }
        
        // 验证必填字段
        if (!taskData.title || !taskData.project) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: '任务事项和所属项目为必填字段' 
                })
            };
        }

        console.log('开始创建飞书任务:', taskData);
        console.log('=== 创建任务API接收的数据 ===');
        console.log('taskData:', JSON.stringify(taskData, null, 2));
        
        // 获取访问令牌
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');
        
        // 创建任务
        const result = await createTask(accessToken, taskData);
        console.log('✅ 任务创建成功');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result,
                message: '任务创建成功'
            })
        };
        
    } catch (error) {
        console.error('❌ 创建任务失败:', error.message);
        console.error('错误详情:', error);

        // 提供更友好的错误信息
        let errorMessage = error.message;
        if (error.message.includes('获取访问令牌失败')) {
            errorMessage = '飞书API访问失败，请检查应用配置';
        } else if (error.message.includes('创建任务失败')) {
            errorMessage = '任务创建失败，可能是权限问题或数据格式错误';
        }

        return {
            statusCode: 200, // 改为200，让前端处理错误
            headers,
            body: JSON.stringify({
                success: false,
                message: errorMessage,
                error: error.message
            })
        };
    }
};
