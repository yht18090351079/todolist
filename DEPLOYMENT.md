# 项目任务管理系统部署指南

## 🚀 快速开始

### 本地测试

1. **安装依赖**
```bash
npm install
```

2. **启动本地服务器**
```bash
npm run dev
```

3. **访问应用**
打开浏览器访问 `http://localhost:3000`

### 📝 配置说明

在使用系统前，请先配置 `js/config.js` 中的相关参数：

#### 飞书配置
- `APP_ID`: `cli_a8d4bd05dbf8100b` ✅ 已配置
- `APP_SECRET`: `IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv` ✅ 已配置
- `BITABLE_ID`: `DPIqbB7OWa05ZZsiQi8cP1jnnBb` ✅ 已配置
- `TABLE_ID`: `tblAyK0L5R7iuKWz` ✅ 已配置

#### 豆包AI配置
- `API_KEY`: `e90111f2-f6a4-40c3-a657-b8383007166f` ✅ 已配置
- `MODEL`: `doubao-seed-1-6-thinking-250615` ✅ 已配置

## 🔧 CORS问题解决方案

系统现在包含一个Node.js代理服务器来解决跨域问题：

- **本地开发**: 使用 `npm run dev` 启动带代理的服务器
- **静态部署**: 使用 `npm run static` 启动纯静态服务器（需要额外配置CORS）

### 🌐 部署选项

#### 选项1：Netlify + Netlify Functions（推荐）

1. **创建Netlify Functions**
```bash
mkdir netlify/functions
```

2. **部署步骤**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <你的GitHub仓库地址>
git push -u origin main
```

3. **Netlify配置**
- 登录 [Netlify](https://netlify.com)
- 连接GitHub仓库
- 构建设置：
  - Build command: `npm install`
  - Publish directory: `/`

#### 选项2：Heroku/Railway/Render（Node.js服务）

1. **推送到Git仓库**
2. **连接到部署平台**
3. **环境变量配置**（如果需要）

#### 选项3：纯静态部署（需要CORS配置）

如果你有自己的CORS代理服务，可以：

1. 修改 `js/config.js` 中的BASE_URL
2. 使用 `npm run static` 测试
3. 部署到任何静态托管平台

### ⚠️ 重要注意事项

#### 关于CORS问题
- 前端直接调用飞书API会遇到CORS限制
- 系统现在使用Node.js代理服务器解决这个问题
- 在生产环境中，建议使用serverless函数或后端服务

#### 飞书权限配置
由于你的飞书表格设置为"所有人都有编辑权限"，系统已经配置好了相应的权限访问。

### 🛠️ 系统功能

- ✅ **任务管理**：创建、编辑、删除任务
- ✅ **项目分类**：按项目组织任务  
- ✅ **状态跟踪**：任务状态、优先级管理
- ✅ **智能搜索**：支持任务名称、描述搜索
- ✅ **统计面板**：实时显示任务统计信息
- ✅ **智能报告**：AI自动生成日报周报
- ✅ **响应式设计**：支持移动端访问
- ✅ **CORS代理**：解决跨域访问问题

### 📊 飞书表格字段匹配

系统会自动读取飞书表格的字段，确保以下字段存在：
- 任务名称
- 项目  
- 状态
- 优先级
- 负责人
- 截止时间
- 描述

### 🔧 故障排除

1. **API调用失败**
   - 检查网络连接
   - 确认飞书应用权限
   - 验证表格ID和应用ID

2. **页面无法加载**
   - 确认服务器正在运行在端口3000
   - 检查浏览器控制台错误信息

3. **报告生成失败**
   - 检查豆包API密钥
   - 确认网络能访问豆包服务

4. **CORS错误**
   - 确保使用 `npm run dev` 启动服务器
   - 检查代理服务器是否正常运行

### 📱 移动端支持

系统已优化移动端体验，支持：
- 响应式布局
- 触控操作
- 移动端友好的交互

### 🔐 安全建议

- 定期更新API密钥
- 监控飞书表格访问日志
- 在生产环境中使用HTTPS
- 考虑将敏感配置移至环境变量

### 💡 开发提示

- 本地开发使用端口 3000
- 代理服务器自动处理CORS问题
- 支持热重载和实时预览

---

现在你可以通过 `http://localhost:3000` 访问你的项目任务管理系统了！🎉