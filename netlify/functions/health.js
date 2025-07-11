// Netlify Function - 健康检查
exports.handler = async (event, context) => {
    // 设置CORS头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // 处理OPTIONS请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // 只允许GET请求
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        const healthInfo = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'feishu-task-api',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'production',
            functions: {
                tasks: 'available',
                'create-task': 'available',
                'update-task': 'available',
                health: 'available'
            },
            feishu: {
                app_id: 'cli_a8d4bd05dbf8100b',
                base_url: 'https://wcn0pu8598xr.feishu.cn/base/DPIqbB7OWa05ZZsiQi8cP1jnnBb',
                table_id: 'tblAyK0L5R7iuKWz'
            }
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: healthInfo
            })
        };
        
    } catch (error) {
        console.error('❌ 健康检查失败:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
