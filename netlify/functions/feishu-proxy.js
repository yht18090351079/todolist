// Netlify Function for Feishu API proxy
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  try {
    // 从路径中提取API路径
    const apiPath = event.path.replace('/.netlify/functions/feishu-proxy', '');
    const feishuUrl = `https://open.feishu.cn/open-apis${apiPath}`;
    
    console.log('代理请求到:', feishuUrl);
    console.log('请求方法:', event.httpMethod);
    console.log('请求体:', event.body);

    // 构建请求选项
    const requestOptions = {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // 添加Authorization头（如果存在）
    if (event.headers.authorization) {
      requestOptions.headers['Authorization'] = event.headers.authorization;
    }

    // 添加请求体（如果存在）
    if (event.body && event.httpMethod !== 'GET') {
      requestOptions.body = event.body;
    }

    // 发送请求到飞书API
    const response = await fetch(feishuUrl, requestOptions);
    const data = await response.json();

    console.log('飞书API响应:', data);

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('代理请求失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '代理请求失败',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
