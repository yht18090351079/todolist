# 🔧 故障排除指南

## 当前问题解决方案

### 问题1: Netlify Functions 返回 500 错误

**现象**: 
- 控制台显示 `PUT https://tasklit.netlify.app/.netlify/functions/update-task 500 (Internal Server Error)`
- 无法保存或更新任务

**原因**: 
- Netlify Functions 服务配置问题
- 后端代理服务暂时不可用

**解决方案**:
1. **立即解决** - 激活CORS代理服务：
   - 访问: https://cors-anywhere.herokuapp.com/corsdemo
   - 点击 "Request temporary access to the demo server"
   - 等待几秒钟后重新尝试保存任务

2. **长期解决** - 修复Netlify Functions：
   - 检查Netlify部署日志
   - 确认Functions目录配置正确
   - 验证环境变量设置

### 问题2: CORS代理返回 403 错误

**现象**:
- 控制台显示 `403 (Forbidden)`
- 系统提示CORS相关错误

**解决方案**:
1. **激活CORS代理** (推荐):
   ```
   1. 访问: https://cors-anywhere.herokuapp.com/corsdemo
   2. 点击激活按钮
   3. 返回系统重新尝试
   ```

2. **等待服务恢复**:
   - CORS代理服务可能临时不可用
   - 通常几分钟内会自动恢复

## 🎯 快速修复步骤

### 步骤1: 激活CORS代理
1. 点击链接: [激活CORS代理](https://cors-anywhere.herokuapp.com/corsdemo)
2. 点击页面上的 "Request temporary access to the demo server" 按钮
3. 看到成功提示后，返回任务管理系统

### 步骤2: 测试功能
1. 点击 "同步数据" 按钮
2. 尝试编辑一个任务
3. 检查连接状态指示器（页面右上角）

### 步骤3: 验证修复
- ✅ 连接状态显示 "服务正常"
- ✅ 可以成功保存任务
- ✅ 任务状态可以正常更新

## 📊 系统状态说明

### 连接状态指示器
位置: 页面右上角，显示当前连接状态

**状态说明**:
- 🟢 **服务正常**: 所有功能可用
- 🟡 **检查中**: 正在检测连接状态
- 🔴 **服务异常**: 部分功能不可用，使用备用数据

### 功能可用性

| 功能 | 正常状态 | 异常状态 | 备注 |
|------|----------|----------|------|
| 查看任务 | ✅ | ✅ | 使用备用数据 |
| 新增任务 | ✅ | ❌ | 需要激活CORS代理 |
| 编辑任务 | ✅ | ❌ | 需要激活CORS代理 |
| 生成报告 | ✅ | ✅ | AI功能独立运行 |
| 项目筛选 | ✅ | ✅ | 前端功能 |

## 🛠️ 高级故障排除

### 检查浏览器控制台
1. 按 F12 打开开发者工具
2. 切换到 "Console" 标签页
3. 查看错误信息：
   - 红色错误: 需要立即处理
   - 黄色警告: 可以忽略
   - 蓝色信息: 正常日志

### 常见错误代码
- **403 Forbidden**: CORS代理需要激活
- **500 Internal Server Error**: 后端服务问题
- **404 Not Found**: 资源不存在
- **CORS Error**: 跨域访问被阻止

### 网络连接检查
```bash
# 检查Netlify Functions
curl https://tasklit.netlify.app/.netlify/functions/health

# 检查CORS代理
curl https://cors-anywhere.herokuapp.com/
```

## 📞 获取帮助

### 自助解决
1. 查看本故障排除指南
2. 检查浏览器控制台错误
3. 尝试刷新页面重新加载

### 联系支持
如果问题持续存在：
1. 截图错误信息
2. 记录操作步骤
3. 提供浏览器和操作系统信息

## 🔄 系统恢复检查清单

完成以下检查确认系统正常：

- [ ] 访问 https://cors-anywhere.herokuapp.com/corsdemo 并激活服务
- [ ] 刷新任务管理系统页面
- [ ] 连接状态显示为 "服务正常"
- [ ] 可以查看任务列表
- [ ] 可以新增任务
- [ ] 可以编辑现有任务
- [ ] 可以生成AI报告
- [ ] 项目标签页正常切换

---

**最后更新**: 2024-12-04
**适用版本**: v1.0.0
