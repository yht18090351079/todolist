// Netlify Function for Feishu access token
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    console.log('获取访问令牌请求:', requestBody);

    // 发送请求到飞书API
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: requestBody.app_id,
        app_secret: requestBody.app_secret
      })
    });

    const data = await response.json();
    console.log('飞书API响应:', data);

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('获取访问令牌失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '获取访问令牌失败',
        message: error.message
      })
    };
  }
};
