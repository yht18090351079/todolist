// 测试豆包API密钥是否有效
const https = require('https');

// 豆包API配置
const DOUBAO_CONFIG = {
    API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    API_KEY: 'e90111f2-f6a4-40c3-a657-b8383007166f',
    MODEL: 'doubao-seed-1.6-250615'
};

// 测试API调用
function testDoubaoAPI() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: DOUBAO_CONFIG.MODEL,
            messages: [
                {
                    role: 'user',
                    content: '你好，请简单介绍一下你自己。'
                }
            ],
            max_tokens: 100,
            temperature: 0.7
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

        console.log('🧪 测试豆包API连接...');
        console.log('API URL:', DOUBAO_CONFIG.API_URL);
        console.log('模型ID:', DOUBAO_CONFIG.MODEL);
        console.log('API密钥:', DOUBAO_CONFIG.API_KEY.substring(0, 8) + '...');

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    console.log('HTTP状态码:', res.statusCode);
                    console.log('响应头:', res.headers);
                    
                    if (res.statusCode === 200) {
                        const result = JSON.parse(data);
                        console.log('✅ API调用成功!');
                        console.log('响应内容:', result.choices[0].message.content);
                        resolve(result);
                    } else {
                        console.error('❌ API调用失败');
                        console.error('状态码:', res.statusCode);
                        console.error('响应内容:', data);
                        reject(new Error(`API调用失败: ${res.statusCode} ${data}`));
                    }
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    console.error('原始响应:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求错误:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 运行测试
async function runTest() {
    try {
        console.log('🚀 开始测试豆包API密钥有效性...');
        console.log('================================');
        
        const result = await testDoubaoAPI();
        
        console.log('\n🎉 测试成功! API密钥有效，可以正常调用豆包API。');
        console.log('现在可以使用日报周报功能了。');
        
    } catch (error) {
        console.error('\n💥 测试失败:', error.message);
        console.error('请检查API密钥是否正确，或者网络连接是否正常。');
    }
}

runTest();
