// 测试超时修复
const https = require('https');

// 豆包API配置
const DOUBAO_CONFIG = {
    API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    API_KEY: 'e90111f2-f6a4-40c3-a657-b8383007166f',
    MODEL: 'doubao-seed-1.6-250615'
};

// 测试短内容生成（避免超时）
function testShortContent() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: DOUBAO_CONFIG.MODEL,
            messages: [
                {
                    role: 'user',
                    content: '请用50字以内简单总结今天的工作。'
                }
            ],
            max_tokens: 100,  // 限制token数量
            temperature: 0.7,
            stream: false
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
            },
            timeout: 15000  // 15秒超时
        };

        console.log('🧪 测试短内容生成（避免超时）...');
        console.log('最大tokens:', 100);
        console.log('超时设置:', '15秒');

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    console.log('HTTP状态码:', res.statusCode);
                    
                    if (res.statusCode === 200) {
                        const result = JSON.parse(data);
                        console.log('✅ 短内容生成成功!');
                        console.log('响应内容:', result.choices[0].message.content);
                        console.log('Token使用:', result.usage);
                        resolve(result);
                    } else {
                        console.error('❌ API调用失败');
                        console.error('状态码:', res.statusCode);
                        console.error('响应内容:', data);
                        reject(new Error(`API调用失败: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    reject(error);
                }
            });
        });

        req.on('timeout', () => {
            console.error('❌ 请求超时');
            req.destroy();
            reject(new Error('请求超时'));
        });

        req.on('error', (error) => {
            console.error('❌ 请求错误:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 测试Netlify Function
async function testNetlifyFunction() {
    try {
        console.log('\n🌐 测试Netlify Function...');
        
        const response = await fetch('https://tasklit.netlify.app/.netlify/functions/doubao-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: '请用30字简单介绍一下你自己。'
                    }
                ]
            })
        });
        
        console.log('Netlify响应状态:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Netlify Function调用成功!');
            console.log('响应数据:', data);
        } else {
            console.error('❌ Netlify Function调用失败');
            const errorText = await response.text();
            console.error('错误内容:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Netlify Function测试失败:', error.message);
    }
}

// 运行测试
async function runTests() {
    try {
        console.log('🚀 开始测试超时修复方案...');
        console.log('================================');
        
        // 测试1: 直接API调用
        await testShortContent();
        
        // 等待2秒
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 测试2: Netlify Function
        await testNetlifyFunction();
        
        console.log('\n🎉 所有测试完成!');
        
    } catch (error) {
        console.error('\n💥 测试失败:', error.message);
    }
}

runTests();
