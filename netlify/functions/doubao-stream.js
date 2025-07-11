// 豆包API流式输出服务
const https = require('https');

// 豆包API配置
const DOUBAO_CONFIG = {
    API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    API_KEY: process.env.ARK_API_KEY || 'e90111f2-f6a4-40c3-a657-b8383007166f',
    MODEL: 'doubao-seed-1.6-250615'
};

// 主函数 - 支持流式输出
exports.handler = async (event, context) => {
    // 设置SSE响应头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
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
            body: 'Method Not Allowed'
        };
    }

    try {
        // 解析请求体
        const requestData = JSON.parse(event.body);
        const { messages } = requestData;

        if (!messages || !Array.isArray(messages)) {
            throw new Error('缺少messages参数或格式错误');
        }

        console.log('收到流式输出请求:', {
            messagesCount: messages.length,
            firstMessage: messages[0]?.content?.substring(0, 100) + '...'
        });

        // 调用豆包API并流式返回
        const streamContent = await streamDoubaoAPI(messages);

        // 返回完整内容（模拟流式效果）
        return {
            statusCode: 200,
            headers,
            body: streamContent
        };

    } catch (error) {
        console.error('流式输出错误:', error);
        
        return {
            statusCode: 500,
            headers,
            body: `ERROR: ${error.message}`
        };
    }
};

// 流式调用豆包API
function streamDoubaoAPI(messages) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: DOUBAO_CONFIG.MODEL,
            messages: messages,
            max_tokens: 1500,
            temperature: 0.7,
            stream: true
        });

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

        console.log('开始流式调用豆包API...');

        const req = https.request(options, (res) => {
            let buffer = '';
            let fullContent = '';
            
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
                buffer += chunk.toString();
                
                // 处理流式数据
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留不完整的行
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6).trim();
                        
                        if (jsonStr === '[DONE]') {
                            continue;
                        }
                        
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                const content = parsed.choices[0].delta.content;
                                if (content) {
                                    fullContent += content;
                                    // 这里可以实时发送数据，但由于Netlify限制，我们收集完整内容后返回
                                }
                            }
                        } catch (e) {
                            // 忽略JSON解析错误
                            console.warn('JSON解析错误:', e.message);
                        }
                    }
                }
            });
            
            res.on('end', () => {
                console.log('豆包API流式响应完成，总长度:', fullContent.length);
                resolve(fullContent);
            });
            
            res.on('error', (error) => {
                console.error('豆包API响应错误:', error);
                reject(error);
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
