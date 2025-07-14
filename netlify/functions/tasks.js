// Netlify Function - 获取任务列表
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

// 获取任务数据
async function getTasks(accessToken) {
    return new Promise((resolve, reject) => {
        const appToken = parseFeishuUrl(FEISHU_CONFIG.BASE_URL);
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
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
                        console.log('飞书返回的记录数:', result.data.items.length);

                        // 打印第一条记录的字段信息用于调试
                        if (result.data.items.length > 0) {
                            console.log('第一条记录的字段:', Object.keys(result.data.items[0].fields));
                            console.log('完成时间字段值:', result.data.items[0].fields['完成时间']);
                        }

                        // 转换数据格式
                        const tasks = result.data.items.map(record => {
                            const fields = record.fields;
                            return {
                                id: record.record_id,
                                title: fields['任务事项'] || '',
                                project: fields['所属项目'] || '',
                                assignee: fields['对接人'] || '',
                                dueDate: fields['截止日期'] || '',
                                createTime: fields['创建时间'] || '',
                                completed: fields['是否已完成'] || false,
                                completedTime: fields['完成时间'] || null, // 添加完成时间字段
                                完成时间: fields['完成时间'] || null, // 同时保留中文字段名
                                daysToDeadline: fields['距离截止日'] || 0
                            };
                        });
                        resolve(tasks);
                    } else {
                        reject(new Error(`获取任务失败: ${result.msg}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// 备用数据（如果API调用失败）
const fallbackTasks = [
    {
        id: 'fallback_1',
        title: '准备下一季度销售计划',
        project: '地灾预警',
        assignee: '张三',
        dueDate: '2024-12-10',
        createTime: '2024-12-01',
        completed: false,
        completedTime: null,
        完成时间: null,
        daysToDeadline: 6
    },
    {
        id: 'fallback_2',
        title: '组织员工培训',
        project: '地灾预警',
        assignee: '李四',
        dueDate: '2024-12-15',
        createTime: '2024-12-01',
        completed: true,
        completedTime: '2024/12/04 10:30:00',
        完成时间: '2024/12/04 10:30:00',
        daysToDeadline: 11
    }
];

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

    // 只允许GET请求
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        console.log('开始获取飞书任务数据...');
        
        // 获取访问令牌
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');
        
        // 获取任务数据
        const tasks = await getTasks(accessToken);
        console.log(`✅ 获取任务成功，共 ${tasks.length} 条`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                tasks: tasks,
                source: 'feishu'
            })
        };
        
    } catch (error) {
        console.error('❌ 获取任务失败:', error.message);
        
        // 返回备用数据
        console.log('使用备用数据...');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                tasks: fallbackTasks,
                source: 'fallback',
                error: error.message
            })
        };
    }
};
