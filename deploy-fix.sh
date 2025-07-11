#!/bin/bash

# 修复Netlify Functions部署脚本

echo "🔧 修复Netlify Functions部署问题"
echo "=================================="

# 检查Git状态
if [ ! -d ".git" ]; then
    echo "❌ 未找到Git仓库，请先初始化Git"
    echo "运行: git init"
    exit 1
fi

echo "📋 当前修复内容:"
echo "- 优化update-task函数的超时处理"
echo "- 简化错误处理逻辑"
echo "- 添加更详细的日志记录"
echo ""

# 备份原文件
echo "💾 备份原始文件..."
cp netlify/functions/update-task.js netlify/functions/update-task.js.backup
echo "✅ 备份完成: update-task.js.backup"

# 使用新版本替换
echo "🔄 应用修复版本..."
cp netlify/functions/update-task-v2.js netlify/functions/update-task.js
echo "✅ 文件已更新"

# 检查文件
echo "📝 验证文件内容..."
if grep -q "context.callbackWaitsForEmptyEventLoop" netlify/functions/update-task.js; then
    echo "✅ 超时控制已添加"
else
    echo "❌ 超时控制添加失败"
fi

if grep -q "Promise.race" netlify/functions/update-task.js; then
    echo "✅ 超时保护已添加"
else
    echo "❌ 超时保护添加失败"
fi

# 提交更改
echo ""
echo "📤 提交更改到Git..."
git add .
git status

echo ""
echo "🚀 准备部署修复..."
echo "=================================="
echo ""
echo "请选择部署方式:"
echo "1. 自动提交并推送到GitHub (推荐)"
echo "2. 手动提交 (需要手动推送)"
echo "3. 仅查看更改 (不提交)"
echo ""
read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo "🔄 自动提交并推送..."
        git commit -m "fix: 修复Netlify Functions超时和错误处理问题

- 添加超时控制和保护机制
- 简化错误处理逻辑
- 优化日志记录
- 修复任务更新功能"
        
        echo "📤 推送到GitHub..."
        git push
        
        if [ $? -eq 0 ]; then
            echo "✅ 推送成功!"
            echo ""
            echo "🎉 部署修复完成!"
            echo "=================================="
            echo "📍 Netlify会自动检测到更改并重新部署"
            echo "⏱️  预计需要1-2分钟完成部署"
            echo "🔗 请访问你的Netlify仪表板查看部署状态"
            echo ""
            echo "💡 测试建议:"
            echo "- 等待部署完成后测试任务更新功能"
            echo "- 检查浏览器控制台是否还有错误"
            echo "- 如果仍有问题，请查看Netlify Functions日志"
        else
            echo "❌ 推送失败，请检查网络连接和Git配置"
        fi
        ;;
    2)
        echo "📝 手动提交..."
        git commit -m "fix: 修复Netlify Functions超时和错误处理问题"
        echo "✅ 提交完成"
        echo ""
        echo "⚠️  请手动推送到GitHub:"
        echo "git push"
        ;;
    3)
        echo "📋 查看更改..."
        git diff --cached
        echo ""
        echo "💡 如需提交，请运行:"
        echo "git commit -m '修复Netlify Functions问题'"
        echo "git push"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🔍 故障排除提示:"
echo "=================================="
echo "如果问题仍然存在:"
echo ""
echo "1. 检查Netlify部署日志:"
echo "   - 访问Netlify仪表板"
echo "   - 点击最新部署"
echo "   - 查看Functions日志"
echo ""
echo "2. 检查飞书应用权限:"
echo "   - 确认应用有多维表格读写权限"
echo "   - 检查表格是否对应用开放"
echo ""
echo "3. 本地测试:"
echo "   - 运行: node test-update.js"
echo "   - 确认本地API调用正常"
echo ""
echo "4. 联系支持:"
echo "   - 提供错误截图"
echo "   - 包含浏览器控制台日志"
