// 测试飞书API更新功能
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

// 测试更新记录
async function testUpdate() {
    try {
        console.log('🔑 获取访问令牌...');
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');

        // 使用已知的记录ID进行测试
        const recordId = 'recAhumGQj'; // 从之前的测试中获得
        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb';

        // 准备更新数据
        const updateData = {
            fields: {
                '对接人': '测试更新-' + Date.now()
            }
        };

        const putData = JSON.stringify(updateData);
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${recordId}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(putData)
            }
        };

        console.log('🔄 正在更新记录...');
        console.log('URL:', `https://open.feishu.cn${options.path}`);
        console.log('数据:', updateData);

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
                            console.log('✅ 更新成功!');
                            resolve(result);
                        } else {
                            console.error('❌ 更新失败:', result);
                            reject(new Error(`更新失败: ${result.msg}`));
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

            req.write(putData);
            req.end();
        });

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        throw error;
    }
}

// 运行测试
testUpdate()
    .then(() => {
        console.log('\n🎉 更新测试完成!');
    })
    .catch((error) => {
        console.error('\n💥 更新测试失败:', error.message);
        
        // 分析错误原因
        if (error.message.includes('权限') || error.message.includes('Forbidden')) {
            console.log('\n💡 可能的原因:');
            console.log('- 飞书应用缺少多维表格写入权限');
            console.log('- 表格未对应用开放编辑权限');
            console.log('- 记录被锁定或受保护');
        }
    });
