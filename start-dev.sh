#!/bin/bash

# 项目任务管理系统 - 本地开发启动脚本

echo "🚀 启动项目任务管理系统本地开发环境"
echo "=================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到Python3，请先安装Python3"
    exit 1
fi

echo "✅ 环境检查通过"

# 启动后端API服务器
echo "🔧 启动后端API服务器 (端口3002)..."
node local-server.js &
API_PID=$!

# 等待API服务器启动
sleep 2

# 启动前端静态服务器
echo "🌐 启动前端静态服务器 (端口8000)..."
python3 -m http.server 8000 &
WEB_PID=$!

# 等待服务器启动
sleep 2

echo ""
echo "🎉 开发环境启动成功！"
echo "=================================="
echo "📱 前端地址: http://localhost:8000"
echo "🔧 API地址:  http://localhost:3002"
echo ""
echo "💡 使用说明:"
echo "   - 前端会自动检测到本地API服务器"
echo "   - 可以正常创建和更新任务"
echo "   - 数据保存在内存中，重启后重置"
echo ""
echo "🛑 停止服务: 按 Ctrl+C"

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $API_PID $WEB_PID 2>/dev/null; echo "✅ 服务已停止"; exit 0' INT

# 保持脚本运行
wait
