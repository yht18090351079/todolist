# 项目任务管理系统 - 部署指南

## 🚀 Netlify 部署步骤

### 方法一：GitHub 自动部署（推荐）

1. **准备代码仓库**
   ```bash
   # 初始化Git仓库
   git init
   git add .
   git commit -m "Initial commit: 项目任务管理系统"
   
   # 推送到GitHub
   git remote add origin https://github.com/你的用户名/todolist.git
   git branch -M main
   git push -u origin main
   ```

2. **连接Netlify**
   - 访问 [Netlify](https://netlify.com)
   - 点击 "New site from Git"
   - 选择 GitHub 并授权
   - 选择你的仓库
   - 构建设置：
     - Build command: `echo 'Static site, no build needed'`
     - Publish directory: `.`
     - Functions directory: `netlify/functions`

3. **部署完成**
   - Netlify会自动部署
   - 获得类似 `https://your-site-name.netlify.app` 的URL

### 方法二：手动部署

1. **打包项目文件**
   ```bash
   # 创建部署包（排除不必要的文件）
   zip -r todolist-deploy.zip . -x "*.git*" "*.DS_Store*" "node_modules/*"
   ```

2. **手动上传**
   - 访问 [Netlify](https://netlify.com)
   - 点击 "Deploy manually"
   - 拖拽ZIP文件到部署区域
   - 等待部署完成

## 🔧 配置说明

### 环境变量
系统使用的配置都已硬编码在代码中，无需额外设置环境变量：

- **飞书配置**：
  - APP_ID: `cli_a8d4bd05dbf8100b`
  - APP_SECRET: `IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv`
  - 表格URL: `https://wcn0pu8598xr.feishu.cn/base/DPIqbB7OWa05ZZsiQi8cP1jnnBb`

- **豆包API**：
  - API_KEY: `e90111f2-f6a4-40c3-a657-b8383007666f`
  - MODEL: `doubao-seed-1-6-thinking-250615`

### 文件结构
```
todolist/
├── index.html              # 主页面
├── styles.css              # 样式文件
├── app.js                  # 主应用逻辑
├── feishu-api.js          # 飞书API集成
├── doubao-api.js          # 豆包API集成
├── netlify.toml           # Netlify配置
├── netlify/
│   └── functions/         # Netlify Functions
│       ├── tasks.js       # 获取任务列表
│       ├── create-task.js # 创建任务
│       ├── update-task.js # 更新任务
│       └── health.js      # 健康检查
└── README.md              # 项目说明
```

## 🌐 API 端点

部署后，系统会自动提供以下API端点：

- `GET /.netlify/functions/tasks` - 获取任务列表
- `POST /.netlify/functions/create-task` - 创建新任务
- `PUT /.netlify/functions/update-task` - 更新任务
- `GET /.netlify/functions/health` - 健康检查

## 🧪 测试部署

### 1. 健康检查
```bash
curl https://your-site-name.netlify.app/.netlify/functions/health
```

### 2. 获取任务列表
```bash
curl https://your-site-name.netlify.app/.netlify/functions/tasks
```

### 3. 创建任务
```bash
curl -X POST https://your-site-name.netlify.app/.netlify/functions/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试任务",
    "project": "测试项目",
    "assignee": "测试用户",
    "dueDate": "2024-12-10",
    "completed": false
  }'
```

## 🔍 故障排除

### 常见问题

1. **Functions 无法访问**
   - 检查 `netlify.toml` 中的 functions 目录配置
   - 确保 `netlify/functions/` 目录存在且包含JS文件

2. **飞书API调用失败**
   - 系统会自动使用备用数据
   - 检查飞书应用配置是否正确
   - 确认表格权限设置为"所有人可编辑"

3. **CORS错误**
   - Netlify Functions 已配置CORS头
   - 如果仍有问题，检查浏览器控制台错误信息

4. **豆包API调用失败**
   - 检查API密钥是否有效
   - 确认网络连接正常

### 调试方法

1. **查看Netlify日志**
   - 在Netlify控制台中查看Functions日志
   - 检查部署日志中的错误信息

2. **本地测试**
   ```bash
   # 启动本地服务器
   python3 -m http.server 8000
   
   # 访问 http://localhost:8000
   ```

3. **浏览器调试**
   - 打开开发者工具
   - 查看Console面板的错误信息
   - 检查Network面板的API请求状态

## 📊 性能优化

### 缓存策略
- 静态资源（CSS/JS）缓存1年
- HTML文件不缓存，确保更新及时生效

### CDN加速
- Netlify自动提供全球CDN加速
- 静态资源自动压缩和优化

### 函数优化
- Functions使用Node.js原生模块，启动快速
- 实现了备用数据机制，提高可用性

## 🔐 安全考虑

### API密钥管理
- 当前版本API密钥硬编码在代码中
- 生产环境建议使用环境变量管理敏感信息

### 数据安全
- 所有API调用都通过HTTPS
- 飞书表格权限已设置为可编辑
- 建议定期更新访问凭证

## 📈 监控和维护

### 健康检查
- 使用 `/.netlify/functions/health` 端点监控服务状态
- 可以设置外部监控服务定期检查

### 日志监控
- Netlify提供详细的Functions执行日志
- 可以通过控制台查看错误和性能信息

### 更新部署
- GitHub连接的项目会自动部署
- 手动部署需要重新上传文件

---

## 🎉 部署完成检查清单

- [ ] 网站可以正常访问
- [ ] 任务列表可以加载（即使是备用数据）
- [ ] 可以创建新任务
- [ ] 可以编辑现有任务
- [ ] 报告生成功能正常
- [ ] 响应式设计在移动端正常显示
- [ ] 所有API端点返回正确响应

完成以上检查后，您的项目任务管理系统就成功部署了！🎊
