// Netlify Function for Feishu API calls
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
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const apiPath = requestBody.apiPath || '';

    if (!apiPath) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'API路径不能为空' })
      };
    }

    const feishuUrl = `https://open.feishu.cn/open-apis${apiPath}`;
    console.log('代理请求到:', feishuUrl);
    console.log('请求方法:', requestBody.method || event.httpMethod);

    // 构建请求选项
    const requestOptions = {
      method: requestBody.method || event.httpMethod,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // 添加Authorization头
    if (event.headers.authorization) {
      requestOptions.headers['Authorization'] = event.headers.authorization;
    }

    // 添加请求体
    if (requestBody.data && requestOptions.method !== 'GET') {
      requestOptions.body = JSON.stringify(requestBody.data);
    }

    // 发送请求到飞书API
    const response = await fetch(feishuUrl, requestOptions);
    const data = await response.json();

    console.log('飞书API响应状态:', response.status);

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('API代理请求失败:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'API代理请求失败',
        message: error.message
      })
    };
  }
};