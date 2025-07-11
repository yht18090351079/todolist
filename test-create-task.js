// 测试创建任务功能
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

// 测试创建任务
async function testCreateTask() {
    try {
        console.log('🔑 获取访问令牌...');
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');

        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb';

        // 准备测试数据 - 只包含最基本的字段
        const fieldsData = {
            '任务事项': '测试创建任务-' + Date.now()
        };

        console.log('📝 创建任务数据:', fieldsData);

        const postData = JSON.stringify({
            records: [{
                fields: fieldsData
            }]
        });

        console.log('请求体:', postData);
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log('🔄 正在创建任务...');
        console.log('URL:', `https://open.feishu.cn${options.path}`);

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                console.log('响应状态:', res.statusCode);
                
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        console.log('原始响应:', data);
                        const result = JSON.parse(data);
                        
                        if (result.code === 0) {
                            console.log('✅ 任务创建成功!');
                            console.log('新任务ID:', result.data.records[0].record_id);
                            resolve(result);
                        } else {
                            console.error('❌ 任务创建失败:', result);
                            reject(new Error(`创建失败: ${result.msg}`));
                        }
                    } catch (error) {
                        console.error('❌ 解析响应失败:', error);
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

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        throw error;
    }
}

// 运行测试
testCreateTask()
    .then(() => {
        console.log('\n🎉 创建任务测试完成!');
    })
    .catch((error) => {
        console.error('\n💥 创建任务测试失败:', error.message);
        
        // 分析错误原因
        if (error.message.includes('field validation failed')) {
            console.log('\n💡 可能的原因:');
            console.log('- 缺少必填字段');
            console.log('- 字段格式不正确');
            console.log('- 字段名称不匹配');
            console.log('- 数据类型不符合要求');
        }
    });
