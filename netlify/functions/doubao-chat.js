// 豆包API代理服务
const https = require('https');

// 豆包API配置
const DOUBAO_CONFIG = {
    API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    API_KEY: process.env.ARK_API_KEY || 'e90111f2-f6a4-40c3-a657-b8383007166f',
    MODEL: 'doubao-seed-1.6-250615'
};

// 检查API密钥是否可用
const isAPIKeyValid = DOUBAO_CONFIG.API_KEY && DOUBAO_CONFIG.API_KEY !== 'your-api-key-here';

// 生成模拟响应
function generateMockResponse(messages) {
    const userMessage = messages[messages.length - 1]?.content || '';

    let mockContent = '';

    if (userMessage.includes('日报') || userMessage.includes('今天')) {
        mockContent = `# 📅 工作日报 - ${new Date().toLocaleDateString()}

## 今日完成任务
✅ 完成了重要的项目任务
✅ 解决了技术难题
✅ 与团队进行了有效沟通

## 工作亮点
- 按时完成了既定目标
- 提升了工作效率
- 积极配合团队协作

## 明日计划
- 继续推进项目进度
- 优化工作流程
- 准备下阶段工作

*注：此为演示模式生成的模拟日报，请配置有效的豆包API密钥以获得AI生成的真实报告。*`;
    } else if (userMessage.includes('周报') || userMessage.includes('本周')) {
        mockContent = `# 📊 工作周报 - 第${Math.ceil(new Date().getDate()/7)}周

## 本周工作总结
本周共完成多项重要任务，工作进展顺利。

### 主要成果
- 📈 项目进度按计划推进
- 🔧 解决了多个技术问题
- 👥 加强了团队协作

### 数据统计
- 完成任务数：X个
- 工作效率：良好
- 团队配合：优秀

## 下周计划
- 继续推进重点项目
- 优化工作流程
- 加强技能学习

*注：此为演示模式生成的模拟周报，请配置有效的豆包API密钥以获得AI生成的真实报告。*`;
    } else {
        mockContent = `感谢您的询问！

由于当前处于演示模式（豆包API密钥需要更新），我无法提供真实的AI生成内容。

请联系管理员配置有效的豆包API密钥以启用完整功能。

您的问题：${userMessage.substring(0, 100)}...`;
    }

    return {
        choices: [{
            message: {
                content: mockContent,
                role: 'assistant'
            },
            finish_reason: 'stop'
        }],
        usage: {
            prompt_tokens: 50,
            completion_tokens: 200,
            total_tokens: 250
        }
    };
}

// 调用豆包API
function callDoubaoAPI(messages) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: DOUBAO_CONFIG.MODEL,
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
            stream: true  // 启用流式输出
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

        console.log('调用豆包API:', {
            url: DOUBAO_CONFIG.API_URL,
            model: DOUBAO_CONFIG.MODEL,
            messagesCount: messages.length
        });

        const req = https.request(options, (res) => {
            let data = '';
            let fullContent = '';

            res.on('data', (chunk) => {
                data += chunk;

                // 处理流式数据
                const lines = data.split('\n');
                data = lines.pop(); // 保留不完整的行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        if (jsonStr === '[DONE]') {
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                fullContent += parsed.choices[0].delta.content;
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            });

            res.on('end', () => {
                try {
                    console.log('豆包API响应状态:', res.statusCode);

                    if (res.statusCode === 200) {
                        // 构造标准格式的响应
                        const result = {
                            choices: [{
                                message: {
                                    content: fullContent,
                                    role: 'assistant'
                                },
                                finish_reason: 'stop'
                            }],
                            usage: {
                                prompt_tokens: 100,
                                completion_tokens: fullContent.length / 4,
                                total_tokens: 100 + fullContent.length / 4
                            }
                        };
                        console.log('豆包API流式响应成功，内容长度:', fullContent.length);
                        resolve(result);
                    } else {
                        console.error('豆包API响应错误:', res.statusCode, data);
                        reject(new Error(`豆包API错误: ${res.statusCode} ${data}`));
                    }
                } catch (error) {
                    console.error('处理豆包API流式响应失败:', error);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('豆包API请求失败:', error);
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
            body: JSON.stringify({
                success: false,
                error: '只支持POST请求'
            })
        };
    }

    try {
        // 解析请求体
        const requestData = JSON.parse(event.body);
        const { messages } = requestData;

        if (!messages || !Array.isArray(messages)) {
            throw new Error('缺少messages参数或格式错误');
        }

        console.log('收到豆包API代理请求:', {
            messagesCount: messages.length,
            firstMessage: messages[0]?.content?.substring(0, 100) + '...',
            apiKeyValid: isAPIKeyValid
        });

        let result;

        if (isAPIKeyValid) {
            // 使用真实的豆包API
            result = await callDoubaoAPI(messages);
        } else {
            // 使用模拟模式
            console.log('⚠️ API密钥无效，使用模拟模式');
            result = generateMockResponse(messages);
        }

        // 返回成功响应
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result
            })
        };

    } catch (error) {
        console.error('豆包API代理错误:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || '豆包API调用失败'
            })
        };
    }
};
