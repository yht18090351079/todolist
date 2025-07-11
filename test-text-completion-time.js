// 测试文本格式完成时间的处理
const https = require('https');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
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
                const result = JSON.parse(data);
                if (result.code === 0) {
                    resolve(result.tenant_access_token);
                } else {
                    reject(new Error(`获取访问令牌失败: ${result.msg}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// 测试更新任务完成时间（文本格式）
async function testUpdateCompletionTime(accessToken, taskId, completed) {
    return new Promise((resolve, reject) => {
        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb';

        // 准备更新数据
        const fieldsData = {
            '是否已完成': completed
        };

        // 根据完成状态设置完成时间
        if (completed) {
            // 转换为文本格式
            const now = new Date();
            const formattedTime = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            fieldsData['完成时间'] = formattedTime;
            console.log('设置完成时间文本:', formattedTime);
        } else {
            fieldsData['完成时间'] = '';
            console.log('清空完成时间');
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

        console.log('发送更新请求:', putData);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('响应状态:', res.statusCode);
                    console.log('响应结果:', result);
                    
                    if (result.code === 0) {
                        console.log('✅ 更新成功!');
                        resolve(result);
                    } else {
                        console.log('❌ 更新失败:', result.msg);
                        reject(new Error(`更新失败: ${result.msg}`));
                    }
                } catch (error) {
                    console.log('解析错误:', error);
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(putData);
        req.end();
    });
}

// 主测试函数
async function testTextCompletionTime() {
    try {
        console.log('🧪 开始测试文本格式完成时间...');
        console.log('================================');
        
        // 1. 获取访问令牌
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');
        
        // 2. 测试任务ID（请替换为实际的任务ID）
        const testTaskId = 'recuQDbfd5vGRD'; // 之前创建的测试任务
        
        console.log('\n📝 测试1: 标记任务为完成（设置文本格式完成时间）');
        await testUpdateCompletionTime(accessToken, testTaskId, true);
        
        // 等待2秒
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n📝 测试2: 取消任务完成（清空完成时间）');
        await testUpdateCompletionTime(accessToken, testTaskId, false);
        
        console.log('\n🎉 所有测试完成!');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testTextCompletionTime();
