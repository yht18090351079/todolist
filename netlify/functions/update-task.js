// Netlify Function - 更新任务 (简化版本)
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
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.code === 0) {
                        resolve(result.tenant_access_token);
                    } else {
                        reject(new Error(`获取访问令牌失败: ${result.msg || '未知错误'}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// 更新任务
async function updateTask(accessToken, taskId, taskData) {
    return new Promise((resolve, reject) => {
        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb'; // 直接使用解析好的值
        
        // 准备数据映射
        const fieldsData = {};
        if (taskData.title !== undefined) fieldsData['任务事项'] = taskData.title;
        if (taskData.project !== undefined) fieldsData['所属项目'] = taskData.project;
        if (taskData.assignee !== undefined) fieldsData['对接人'] = taskData.assignee;

        // 处理日期字段 - 只有当日期不为空时才设置
        if (taskData.dueDate !== undefined && taskData.dueDate !== '') {
            // 将日期转换为时间戳（毫秒）
            try {
                const dateObj = new Date(taskData.dueDate);
                if (!isNaN(dateObj.getTime())) {
                    fieldsData['截止日期'] = dateObj.getTime();
                }
            } catch (error) {
                console.warn('日期格式转换失败:', taskData.dueDate, error);
            }
        }

        if (taskData.completed !== undefined) fieldsData['是否已完成'] = taskData.completed;

        // 处理完成时间字段
        if (taskData.completedTime !== undefined) {
            if (taskData.completedTime === null || taskData.completedTime === '') {
                // 清空完成时间 - 设置为空字符串，因为飞书中该字段是文本类型
                fieldsData['完成时间'] = '';
                console.log('清空任务完成时间（设置为空字符串）');
            } else {
                // 设置完成时间 - 确保是有效的时间戳
                try {
                    const timestamp = Number(taskData.completedTime);
                    if (isNaN(timestamp) || timestamp <= 0) {
                        console.warn('无效的完成时间戳，跳过设置:', taskData.completedTime);
                    } else {
                        // 转换为文本格式，因为飞书中该字段是文本类型
                        const completedDate = new Date(timestamp);
                        const formattedTime = completedDate.toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });
                        fieldsData['完成时间'] = formattedTime;
                        console.log('设置任务完成时间文本:', formattedTime, '(原时间戳:', timestamp, ')');
                    }
                } catch (error) {
                    console.error('完成时间处理错误:', error, '原值:', taskData.completedTime);
                }
            }
        }

        const putData = JSON.stringify({ fields: fieldsData });
        
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
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.code === 0) {
                        resolve(result.data);
                    } else {
                        reject(new Error(`更新任务失败: ${result.msg || '未知错误'}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(putData);
        req.end();
    });
}

// 主函数
exports.handler = async (event, context) => {
    // 设置超时控制
    context.callbackWaitsForEmptyEventLoop = false;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Content-Type': 'application/json'
    };

    // 处理OPTIONS请求
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // 只允许PUT请求
    if (event.httpMethod !== 'PUT') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        // 解析请求体
        let requestData;
        try {
            requestData = JSON.parse(event.body || '{}');
        } catch (parseError) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: '请求数据格式错误' 
                })
            };
        }
        
        const { taskId, ...taskData } = requestData;

        // 验证taskId
        if (!taskId) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: '任务ID为必填字段' 
                })
            };
        }

        console.log('开始更新任务:', taskId, taskData);

        // 设置超时保护
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时')), 25000); // 25秒超时
        });

        // 执行更新操作
        const updatePromise = (async () => {
            const accessToken = await getAccessToken();
            return await updateTask(accessToken, taskId, taskData);
        })();

        // 竞争执行，防止超时
        const result = await Promise.race([updatePromise, timeoutPromise]);

        console.log('任务更新成功');
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
        console.error('更新任务失败:', error.message);
        
        // 根据错误类型返回不同的错误信息
        let errorMessage = '任务更新失败';
        if (error.message.includes('超时')) {
            errorMessage = '请求超时，请稍后重试';
        } else if (error.message.includes('权限') || error.message.includes('Forbidden')) {
            errorMessage = '权限不足，请检查飞书应用配置';
        } else if (error.message.includes('访问令牌')) {
            errorMessage = '飞书API认证失败';
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                message: errorMessage,
                error: error.message
            })
        };
    }
};
