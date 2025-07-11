// 最小化测试创建任务
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

// 测试创建任务 - 使用最小字段集
async function testMinimalCreate() {
    try {
        console.log('🔑 获取访问令牌...');
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');

        const appToken = 'DPIqbB7OWa05ZZsiQi8cP1jnnBb';

        // 尝试不同的字段组合
        const testCases = [
            {
                name: '只有任务事项',
                data: { '任务事项': '测试1-' + Date.now() }
            },
            {
                name: '任务事项+项目',
                data: {
                    '任务事项': '测试2-' + Date.now(),
                    '所属项目': '测试项目'
                }
            },
            {
                name: '完整基础字段',
                data: {
                    '任务事项': '测试3-' + Date.now(),
                    '所属项目': '测试项目',
                    '对接人': '测试人员',
                    '是否已完成': false
                }
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n🧪 测试: ${testCase.name}`);
            console.log('字段数据:', testCase.data);

            const postData = JSON.stringify({
                records: [{ fields: testCase.data }]
            });

            console.log('请求体:', postData);

            const success = await testSingleCreate(accessToken, appToken, postData, testCase.name);
            if (success) {
                console.log('🎉 找到可行的字段组合!');
                break;
            }

            // 等待1秒避免API限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        throw error;
    }
}

// 测试单个创建请求
async function testSingleCreate(accessToken, appToken, postData, testName) {
    return new Promise((resolve) => {
        
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

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('响应状态:', res.statusCode);
                    console.log('响应结果:', result);

                    if (result.code === 0) {
                        console.log(`✅ ${testName} 创建成功!`);
                        resolve(true);
                    } else {
                        console.log(`❌ ${testName} 创建失败:`, result.msg);
                        if (result.error && result.error.field_violations) {
                            console.log('字段违规:', result.error.field_violations);
                        }
                        resolve(false);
                    }
                } catch (error) {
                    console.log('解析错误:', error);
                    resolve(false);
                }
            });
        });

        req.on('error', () => resolve(false));
        req.write(postData);
        req.end();
    });
}

// 运行测试
testMinimalCreate()
    .then(() => {
        console.log('\n🎉 最小字段测试完成!');
    })
    .catch((error) => {
        console.error('\n💥 最小字段测试失败:', error.message);
    });
