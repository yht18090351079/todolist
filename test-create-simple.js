// 简单测试创建任务
async function testCreateViaNetlify() {
    try {
        console.log('🧪 测试通过Netlify Functions创建任务...');
        
        const testData = {
            title: '测试新增任务-' + Date.now(),
            project: '测试项目',
            assignee: '测试人员',
            dueDate: '',
            completed: false
        };

        console.log('测试数据:', testData);

        const response = await fetch('https://tasklit.netlify.app/.netlify/functions/create-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log('HTTP状态:', response.status);
        console.log('HTTP状态文本:', response.statusText);

        const result = await response.json();
        console.log('Netlify响应:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ 任务创建成功!');
            console.log('新任务ID:', result.data?.records?.[0]?.record_id);
        } else {
            console.error('❌ 任务创建失败:', result.message);
            console.error('错误详情:', result.error);
        }
        
    } catch (error) {
        console.error('❌ 测试异常:', error.message);
    }
}

// 运行测试
testCreateViaNetlify();
