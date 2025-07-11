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
    // 解析请求体以获取API路径和参数
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
      } catch (e) {
        console.log('无法解析请求体，使用空对象');
      }
    }

    // 从请求体中获取API路径，如果没有则从查询参数获取
    let apiPath = requestData.apiPath || (event.queryStringParameters && event.queryStringParameters.path) || '';

    // 如果还是没有路径，尝试从URL路径提取
    if (!apiPath && event.path) {
      apiPath = event.path.replace('/.netlify/functions/feishu-proxy', '');
    }

    const feishuUrl = `https://open.feishu.cn/open-apis${apiPath}`;

    console.log('原始路径:', event.path);
    console.log('提取的API路径:', apiPath);
    console.log('代理请求到:', feishuUrl);
    console.log('请求方法:', event.httpMethod);
    console.log('请求数据:', requestData);

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

    // 构建请求体
    let requestBody = {};
    if (requestData.app_id && requestData.app_secret) {
      // 这是获取访问令牌的请求
      requestBody = {
        app_id: requestData.app_id,
        app_secret: requestData.app_secret
      };
    } else if (requestData.data) {
      // 其他API请求
      requestBody = requestData.data;
    }

    // 添加请求体（如果存在且不是GET请求）
    if (Object.keys(requestBody).length > 0 && event.httpMethod !== 'GET') {
      requestOptions.body = JSON.stringify(requestBody);
    }

    // 处理GET请求的查询参数
    let finalUrl = feishuUrl;
    if (event.httpMethod === 'GET' && event.queryStringParameters) {
      const params = new URLSearchParams();
      Object.keys(event.queryStringParameters).forEach(key => {
        if (key !== 'path') { // 排除我们用于路径的参数
          params.append(key, event.queryStringParameters[key]);
        }
      });
      if (params.toString()) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + params.toString();
      }
    }

    console.log('最终请求URL:', finalUrl);

    // 发送请求到飞书API
    const response = await fetch(finalUrl, requestOptions);
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
