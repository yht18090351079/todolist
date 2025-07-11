// 测试正确的API格式
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

// 测试正确格式的创建请求
async function testCorrectFormat() {
    try {
        console.log('🔑 获取访问令牌...');
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');

        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb';

        // 使用正确的API格式
        const fieldsData = {
            '任务事项': '正确格式测试-' + Date.now(),
            '所属项目': '测试项目',
            '对接人': '测试人员',
            '是否已完成': false,
            '创建时间': Date.now()
        };

        console.log('📝 字段数据:', fieldsData);

        // 正确的请求体格式
        const postData = JSON.stringify({
            fields: fieldsData
        });
        
        console.log('📤 请求体:', postData);

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
                            console.log('✅ 正确格式创建成功!');
                            console.log('新任务ID:', result.data.record.record_id);
                            console.log('返回的字段:', result.data.record.fields);
                            resolve(result);
                        } else {
                            console.error('❌ 正确格式创建失败:', result);
                            if (result.error && result.error.field_violations) {
                                console.log('字段违规详情:', result.error.field_violations);
                            }
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
testCorrectFormat()
    .then(() => {
        console.log('\n🎉 正确格式测试完成!');
    })
    .catch((error) => {
        console.error('\n💥 正确格式测试失败:', error.message);
    });
