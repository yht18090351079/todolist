// 测试飞书API配置
const https = require('https');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    BASE_URL: 'https://wcn0pu8598xr.feishu.cn/base/DPIqbB7OWa05ZZsiQi8cP1jnnBb',
    TABLE_ID: 'tblAyK0L5R7iuKWz'
};

// 解析飞书URL获取app_token
function parseFeishuUrl(url) {
    const match = url.match(/\/base\/([a-zA-Z0-9]+)/);
    if (!match) {
        throw new Error('无法解析飞书表格URL');
    }
    return match[1];
}

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

        console.log('🔑 正在获取访问令牌...');
        console.log('APP_ID:', FEISHU_CONFIG.APP_ID);

        const req = https.request(options, (res) => {
            let data = '';
            console.log('响应状态码:', res.statusCode);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    console.log('原始响应:', data);
                    const result = JSON.parse(data);
                    
                    if (result.code === 0) {
                        console.log('✅ 访问令牌获取成功');
                        resolve(result.tenant_access_token);
                    } else {
                        console.error('❌ 获取访问令牌失败:', result);
                        reject(new Error(`获取访问令牌失败: ${result.msg || result.message || '未知错误'}`));
                    }
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    console.error('原始数据:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 获取表格记录
async function getTableRecords(accessToken) {
    return new Promise((resolve, reject) => {
        const appToken = parseFeishuUrl(FEISHU_CONFIG.BASE_URL);
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        console.log('📋 正在获取表格记录...');
        console.log('App Token:', appToken);
        console.log('Table ID:', FEISHU_CONFIG.TABLE_ID);

        const req = https.request(options, (res) => {
            let data = '';
            console.log('响应状态码:', res.statusCode);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    console.log('原始响应:', data.substring(0, 500) + '...');
                    const result = JSON.parse(data);
                    
                    if (result.code === 0) {
                        console.log('✅ 表格记录获取成功');
                        console.log('记录数量:', result.data.items.length);
                        resolve(result.data);
                    } else {
                        console.error('❌ 获取表格记录失败:', result);
                        reject(new Error(`获取表格记录失败: ${result.msg || result.message || '未知错误'}`));
                    }
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    console.error('原始数据:', data.substring(0, 200));
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.end();
    });
}

// 测试更新记录
async function testUpdateRecord(accessToken, recordId) {
    return new Promise((resolve, reject) => {
        const appToken = parseFeishuUrl(FEISHU_CONFIG.BASE_URL);

        // 测试数据 - 只更新一个字段
        const fieldsData = {
            '对接人': '测试更新-' + new Date().getTime()
        };

        const putData = JSON.stringify({
            fields: fieldsData
        });

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

        console.log('🔄 正在测试更新记录...');
        console.log('记录ID:', recordId);
        console.log('更新数据:', fieldsData);

        const req = https.request(options, (res) => {
            let data = '';
            console.log('响应状态码:', res.statusCode);

            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    console.log('原始响应:', data);
                    const result = JSON.parse(data);

                    if (result.code === 0) {
                        console.log('✅ 记录更新成功');
                        resolve(result.data);
                    } else {
                        console.error('❌ 记录更新失败:', result);
                        reject(new Error(`更新记录失败: ${result.msg || result.message || '未知错误'}`));
                    }
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    console.error('原始数据:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.write(putData);
        req.end();
    });
}

// 主测试函数
async function testFeishuAPI() {
    console.log('🧪 开始测试飞书API配置');
    console.log('================================');

    try {
        // 1. 测试获取访问令牌
        console.log('\n1️⃣ 测试获取访问令牌');
        const accessToken = await getAccessToken();
        console.log('访问令牌长度:', accessToken.length);

        // 2. 测试获取表格记录
        console.log('\n2️⃣ 测试获取表格记录');
        const records = await getTableRecords(accessToken);
        console.log('获取到记录数:', records.items.length);

        if (records.items.length > 0) {
            console.log('第一条记录示例:');
            console.log('- 记录ID:', records.items[0].record_id);
            console.log('- 字段:', Object.keys(records.items[0].fields));

            // 3. 测试更新记录
            console.log('\n3️⃣ 测试更新记录');
            const firstRecordId = records.items[0].record_id;
            await testUpdateRecord(accessToken, firstRecordId);
        }

        console.log('\n✅ 飞书API配置测试通过！');
        console.log('================================');
        
    } catch (error) {
        console.error('\n❌ 飞书API配置测试失败!');
        console.error('错误信息:', error.message);
        console.error('================================');
        
        // 提供解决建议
        console.log('\n💡 可能的解决方案:');
        if (error.message.includes('权限') || error.message.includes('Forbidden')) {
            console.log('- 检查飞书应用权限配置');
            console.log('- 确认应用已获得多维表格的读写权限');
            console.log('- 检查表格是否对应用开放');
        } else if (error.message.includes('访问令牌')) {
            console.log('- 检查APP_ID和APP_SECRET是否正确');
            console.log('- 确认应用状态是否正常');
        } else {
            console.log('- 检查网络连接');
            console.log('- 确认飞书服务是否正常');
        }
    }
}

// 运行测试
testFeishuAPI();
