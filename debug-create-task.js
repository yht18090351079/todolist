// 调试创建任务问题
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

// 获取现有记录的字段结构
async function getExistingRecord(accessToken) {
    return new Promise((resolve, reject) => {
        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb';
        
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: `/open-apis/bitable/v1/apps/${appToken}/tables/${FEISHU_CONFIG.TABLE_ID}/records?page_size=1`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                if (result.code === 0 && result.data.items.length > 0) {
                    resolve(result.data.items[0]);
                } else {
                    reject(new Error('无法获取现有记录'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// 测试不同的字段组合
async function testCreateWithDifferentFields(accessToken, testCase) {
    return new Promise((resolve, reject) => {
        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb';

        const postData = JSON.stringify({
            records: [{ fields: testCase.fields }]
        });
        
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

        console.log(`\n🧪 测试案例: ${testCase.name}`);
        console.log('字段数据:', testCase.fields);
        console.log('请求体:', postData);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('响应状态:', res.statusCode);
                    console.log('响应结果:', result);
                    
                    if (result.code === 0) {
                        console.log('✅ 成功!');
                        resolve({ success: true, data: result });
                    } else {
                        console.log('❌ 失败:', result.msg);
                        if (result.error && result.error.field_violations) {
                            console.log('字段违规:', result.error.field_violations);
                        }
                        resolve({ success: false, error: result });
                    }
                } catch (error) {
                    console.log('❌ 解析错误:', error);
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// 主测试函数
async function debugCreateTask() {
    try {
        console.log('🔍 开始调试创建任务问题');
        console.log('================================');
        
        // 1. 获取访问令牌
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');
        
        // 2. 获取现有记录结构
        const existingRecord = await getExistingRecord(accessToken);
        console.log('\n📋 现有记录字段结构:');
        console.log('字段列表:', Object.keys(existingRecord.fields));
        console.log('示例数据:', existingRecord.fields);
        
        // 3. 测试不同的字段组合
        const testCases = [
            {
                name: '最小字段集',
                fields: {
                    '任务事项': '测试最小字段-' + Date.now()
                }
            },
            {
                name: '基本字段集',
                fields: {
                    '任务事项': '测试基本字段-' + Date.now(),
                    '所属项目': '测试项目'
                }
            },
            {
                name: '完整字段集（模拟现有记录）',
                fields: {
                    '任务事项': '测试完整字段-' + Date.now(),
                    '所属项目': '测试项目',
                    '对接人': '测试人员',
                    '是否已完成': false,
                    '创建时间': Date.now(),
                    '完成时间': null
                }
            },
            {
                name: '与现有记录完全相同的字段类型',
                fields: {
                    '任务事项': '测试相同类型-' + Date.now(),
                    '创建时间': Date.now(),
                    '完成时间': null,
                    '对接人': '测试人员',
                    '所属项目': '测试项目',
                    '是否已完成': false
                }
            }
        ];
        
        for (const testCase of testCases) {
            const result = await testCreateWithDifferentFields(accessToken, testCase);
            if (result.success) {
                console.log('🎉 找到可行的字段组合!');
                break;
            }
            // 等待一秒避免API限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('❌ 调试失败:', error.message);
    }
}

// 运行调试
debugCreateTask();
