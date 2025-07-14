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
        
        // 构建字段数据（极简版本，逐个测试字段）
        const fieldsData = {};

        // 先只测试一个字段
        fieldsData['类型'] = String(reportData.type || '');

        // 如果类型字段成功，再逐步添加其他字段
        // fieldsData['标题'] = String(reportData.title || '');
        // fieldsData['内容'] = String(reportData.content || '');
        // fieldsData['日期'] = String(reportData.date || '');

        console.log('🔍 字段名验证版本:');
        console.log('期望的飞书字段: 类型、标题、内容、日期、任务数量、生成时间');
        console.log('当前使用的字段:');
        Object.keys(fieldsData).forEach(key => {
            const value = fieldsData[key];
            console.log(`  字段名: "${key}" | 类型: ${typeof value} | 值: ${key === '内容' ? `长度${String(value).length}字符` : String(value).substring(0, 50)}`);
        });

        console.log('字段数量:', Object.keys(fieldsData).length);
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
