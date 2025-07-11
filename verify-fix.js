// 验证修复状态
const https = require('https');

async function verifyNetlifyAPI() {
    return new Promise((resolve, reject) => {
        const testData = JSON.stringify({
            taskId: 'recAhumGQj',
            title: '验证修复-' + Date.now(),
            project: '测试项目',
            assignee: '测试人员',
            completed: false
        });

        const options = {
            hostname: 'tasklit.netlify.app',
            port: 443,
            path: '/.netlify/functions/update-task',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData)
            }
        };

        console.log('🔄 测试Netlify Functions API...');
        console.log('URL:', `https://${options.hostname}${options.path}`);

        const req = https.request(options, (res) => {
            let data = '';
            console.log('响应状态:', res.statusCode);
            
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('响应数据:', JSON.stringify(result, null, 2));
                    
                    if (result.success) {
                        console.log('✅ Netlify Functions API 正常工作!');
                        resolve(result);
                    } else {
                        console.error('❌ API返回错误:', result.message);
                        reject(new Error(result.message));
                    }
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    console.error('原始响应:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.write(testData);
        req.end();
    });
}

async function main() {
    console.log('🧪 验证修复状态');
    console.log('==================');
    
    try {
        await verifyNetlifyAPI();
        
        console.log('\n🎉 修复验证成功!');
        console.log('==================');
        console.log('✅ Netlify Functions 正常工作');
        console.log('✅ 飞书API调用成功');
        console.log('✅ 任务更新功能正常');
        
        console.log('\n💡 如果前端仍有问题:');
        console.log('1. 清除浏览器缓存 (Ctrl+F5)');
        console.log('2. 访问: http://localhost:8000/test-api-status.html');
        console.log('3. 检查浏览器控制台错误');
        
    } catch (error) {
        console.error('\n❌ 修复验证失败!');
        console.error('错误:', error.message);
        
        console.log('\n🔧 故障排除:');
        console.log('1. 检查Netlify部署状态');
        console.log('2. 查看Netlify Functions日志');
        console.log('3. 确认代码已正确推送到GitHub');
    }
}

main();
