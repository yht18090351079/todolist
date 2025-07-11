// Netlify Function for Doubao AI API proxy
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
    console.log('豆包API请求:', requestBody);

    // 发送请求到豆包API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${requestBody.apiKey}`
      },
      body: JSON.stringify({
        model: requestBody.model,
        messages: requestBody.messages
      })
    });

    const data = await response.json();
    console.log('豆包API响应:', data);

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('豆包API请求失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '豆包API请求失败',
        message: error.message
      })
    };
  }
};
