// 豆包API代理服务
const https = require('https');

// 豆包API配置
const DOUBAO_CONFIG = {
    API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    API_KEY: process.env.ARK_API_KEY || 'e90111f2-f6a4-40c3-a657-b8383007166f',
    MODEL: 'doubao-seed-1-6-250615'
};

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
            body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
        };
    }

    try {
        // 解析请求体
        const requestData = JSON.parse(event.body);
        const { model, messages, max_tokens, temperature } = requestData;

        if (!messages || !Array.isArray(messages)) {
            throw new Error('缺少messages参数或格式错误');
        }

        console.log('收到豆包API请求:', {
            model: model || DOUBAO_CONFIG.MODEL,
            messagesCount: messages.length,
            maxTokens: max_tokens || 2000
        });

        // 调用豆包API
        const result = await callDoubaoAPI({
            model: model || DOUBAO_CONFIG.MODEL,
            messages: messages,
            max_tokens: max_tokens || 2000,
            temperature: temperature || 0.7
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result
            })
        };

    } catch (error) {
        console.error('豆包API调用失败:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

// 调用豆包API
function callDoubaoAPI(requestData) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(requestData);

        const url = new URL(DOUBAO_CONFIG.API_URL);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOUBAO_CONFIG.API_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log('调用豆包API...');

        const req = https.request(options, (res) => {
            let data = '';

            console.log('豆包API响应状态:', res.statusCode);

            if (res.statusCode !== 200) {
                let errorData = '';
                res.on('data', chunk => errorData += chunk);
                res.on('end', () => {
                    reject(new Error(`豆包API错误: ${res.statusCode} ${errorData}`));
                });
                return;
            }

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('豆包API调用成功');
                    resolve(result);
                } catch (parseError) {
                    console.error('解析豆包API响应失败:', parseError);
                    reject(new Error('解析API响应失败'));
                }
            });
        });

        req.on('error', (error) => {
            console.error('豆包API请求错误:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}