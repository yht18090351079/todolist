// Netlify Function - 保存报告到飞书表格
const https = require('https');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    BASE_URL: 'https://wcn0pu8598xr.feishu.cn/base/DPIqbB7OWa05ZZsiQi8cP1jnnBb',
    REPORT_TABLE_ID: 'tblgMxHJqUJH2s8A' // 报告表格ID
};

console.log('飞书配置信息:');
console.log('APP_ID:', FEISHU_CONFIG.APP_ID);
console.log('BASE_URL:', FEISHU_CONFIG.BASE_URL);
console.log('REPORT_TABLE_ID:', FEISHU_CONFIG.REPORT_TABLE_ID);

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

// 解析飞书URL获取app_token
function parseFeishuUrl(url) {
    const match = url.match(/\/base\/([^?]+)/);
    return match ? match[1] : null;
}

// 保存报告到飞书表格
async function saveReportToFeishu(accessToken, reportData) {
    return new Promise((resolve, reject) => {
        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb'; // 直接使用解析好的值，与任务操作保持一致
        
        // 构建字段数据（最简化测试版本）
        const fieldsData = {};

        // 只测试最基本的字段，逐步添加
        fieldsData['类型'] = String(reportData.type || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');  // 只保留中英文数字

        // 简化标题，移除特殊字符
        let title = String(reportData.title || '');
        title = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\-]/g, '');  // 只保留中英文数字空格横线
        if (title.length > 100) {
            title = title.substring(0, 100);
        }
        fieldsData['标题'] = title;

        // 简化日期
        let date = String(reportData.date || '');
        date = date.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\-至]/g, '');  // 只保留基本字符
        fieldsData['日期'] = date;

        // 暂时跳过内容字段进行测试
        fieldsData['内容'] = '测试内容';

        // 暂时跳过其他字段
        // fieldsData['任务数量'] = Number(reportData.taskCount) || 0;
        // fieldsData['生成时间'] = Date.now();

        console.log('🧪 最简化测试版本 - 字段数据:');
        console.log('原始数据:', {
            type: reportData.type,
            title: reportData.title ? reportData.title.substring(0, 50) + '...' : null,
            date: reportData.date,
            taskCount: reportData.taskCount
        });

        console.log('清理后的字段数据:');
        Object.keys(fieldsData).forEach(key => {
            const value = fieldsData[key];
            console.log(`  ✓ ${key}: "${value}" (${typeof value}, 长度: ${String(value).length})`);
        });
        console.log('报告内容长度:', reportData.content ? reportData.content.length : 0);

        // 使用与任务创建相同的API格式 - 直接传递fields对象
        const postData = JSON.stringify({ fields: fieldsData });
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.REPORT_TABLE_ID}/records`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log('飞书API请求路径:', options.path);
        console.log('请求数据:', postData);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('飞书API响应:', result);

                    if (result.code === 0) {
                        resolve(result.data);
                    } else {
                        // 详细的错误信息
                        let errorMsg = `保存报告失败: ${result.msg || '未知错误'}`;

                        if (result.code === 99991663) {
                            errorMsg = '权限不足：应用没有访问该表格的权限';
                        } else if (result.code === 99991664) {
                            errorMsg = '表格不存在或ID错误';
                        } else if (result.code === 99991665) {
                            errorMsg = '字段不存在或字段名错误';
                        }

                        console.error('飞书API错误详情:', {
                            code: result.code,
                            msg: result.msg,
                            error: errorMsg
                        });

                        reject(new Error(errorMsg));
                    }
                } catch (error) {
                    console.error('解析飞书API响应失败:', error);
                    reject(error);
                }
            });
        });

        req.on('error', reject);
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
            body: JSON.stringify({
                success: false,
                error: '只允许POST请求'
            })
        };
    }

    try {
        console.log('开始处理保存报告请求...');
        
        // 解析请求数据
        const reportData = JSON.parse(event.body);
        console.log('接收到的报告数据:', reportData);

        // 验证必要字段
        if (!reportData.title || !reportData.type) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: '缺少必要字段: title, type'
                })
            };
        }

        // 如果是测试模式，使用极简数据
        if (reportData.title.includes('测试') || process.env.NODE_ENV === 'test') {
            console.log('🧪 使用极简测试数据');
            const testData = {
                fields: {
                    '类型': '测试',
                    '标题': '测试报告',
                    '内容': '测试内容',
                    '日期': '2025-07-14'
                }
            };

            // 直接尝试保存测试数据
            try {
                const accessToken = await getAccessToken();
                const result = await saveReportToFeishu(accessToken, {
                    type: '测试',
                    title: '测试报告',
                    content: '测试内容',
                    date: '2025-07-14'
                });

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: '测试数据保存成功',
                        data: result
                    })
                };
            } catch (error) {
                console.error('测试数据保存失败:', error);
            }
        }

        // 验证字段长度
        if (reportData.title && reportData.title.length > 500) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: '标题过长，最大500字符'
                })
            };
        }

        // 获取访问令牌
        console.log('获取飞书访问令牌...');
        const accessToken = await getAccessToken();
        console.log('访问令牌获取成功');

        // 保存报告到飞书
        console.log('保存报告到飞书表格...');
        const result = await saveReportToFeishu(accessToken, reportData);
        console.log('报告保存成功:', result);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '报告保存成功',
                data: result
            })
        };

    } catch (error) {
        console.error('保存报告失败:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || '保存报告失败'
            })
        };
    }
};
