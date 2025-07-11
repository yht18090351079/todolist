// 豆包大模型API集成模块
class DoubaoAPI {
    constructor() {
        // 豆包API配置 - 使用正确的API密钥和模型ID
        this.config = {
            API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            API_KEY: 'e90111f2-f6a4-40c3-a657-b8383007166f',
            MODEL: 'doubao-seed-1.6-250615'
        };
    }

    // 获取代理服务器URL
    getProxyUrl() {
        // 检测环境：本地开发 vs 生产环境
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3002';
        } else {
            return 'https://tasklit.netlify.app/.netlify/functions';
        }
    }

    // 调用豆包API生成文本
    async generateText(messages) {
        try {
            console.log('调用豆包API生成文本...');

            // 使用代理服务器调用豆包API
            const proxyUrl = this.getProxyUrl();
            const response = await fetch(`${proxyUrl}/doubao-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const doubaoResponse = data.data;
                if (doubaoResponse.choices && doubaoResponse.choices.length > 0) {
                    console.log('✅ 豆包API调用成功');
                    return {
                        success: true,
                        content: doubaoResponse.choices[0].message.content
                    };
                } else {
                    throw new Error('豆包API返回格式错误');
                }
            } else {
                throw new Error(`代理服务器调用失败: ${data.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('❌ 豆包API调用失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 生成日报
    async generateDailyReport(tasks, date, projectFilter = '') {
        try {
            console.log('生成日报...', { date, projectFilter, tasksCount: tasks.length });

            // 筛选任务
            let filteredTasks = tasks;
            if (projectFilter) {
                filteredTasks = tasks.filter(task => task.project === projectFilter);
            }

            // 按状态分类任务
            const completedTasks = filteredTasks.filter(task => task.completed);
            const pendingTasks = filteredTasks.filter(task => !task.completed);
            const urgentTasks = pendingTasks.filter(task => {
                if (!task.dueDate) return false;
                const dueDate = new Date(task.dueDate);
                const today = new Date();
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 3 && diffDays >= 0;
            });

            // 构建提示词
            const prompt = `请根据以下任务信息生成一份专业的工作日报：

日期: ${date}
${projectFilter ? `项目: ${projectFilter}` : ''}

已完成任务 (${completedTasks.length}项):
${completedTasks.map(task => `- ${task.title} (${task.project}) - 负责人: ${task.assignee || '未指定'}`).join('\n')}

进行中任务 (${pendingTasks.length}项):
${pendingTasks.map(task => `- ${task.title} (${task.project}) - 负责人: ${task.assignee || '未指定'} - 截止: ${task.dueDate || '未设定'}`).join('\n')}

紧急任务 (${urgentTasks.length}项):
${urgentTasks.map(task => `- ${task.title} (${task.project}) - 负责人: ${task.assignee || '未指定'} - 截止: ${task.dueDate}`).join('\n')}

请生成一份结构清晰、内容详实的工作日报，包含：
1. 今日工作总结
2. 完成情况分析
3. 存在问题和风险
4. 明日工作计划
5. 需要协调的事项

请用专业、简洁的语言，突出重点工作和关键进展。`;

            const messages = [
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const result = await this.generateText(messages);
            
            if (result.success) {
                console.log('✅ 日报生成成功');
                return {
                    success: true,
                    report: result.content,
                    type: 'daily',
                    date: date,
                    project: projectFilter,
                    stats: {
                        total: filteredTasks.length,
                        completed: completedTasks.length,
                        pending: pendingTasks.length,
                        urgent: urgentTasks.length
                    }
                };
            } else {
                return result;
            }
        } catch (error) {
            console.error('❌ 生成日报失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 生成周报
    async generateWeeklyReport(tasks, date, projectFilter = '') {
        try {
            console.log('生成周报...', { date, projectFilter, tasksCount: tasks.length });

            // 筛选任务
            let filteredTasks = tasks;
            if (projectFilter) {
                filteredTasks = tasks.filter(task => task.project === projectFilter);
            }

            // 计算周期范围
            const reportDate = new Date(date);
            const weekStart = new Date(reportDate);
            weekStart.setDate(reportDate.getDate() - reportDate.getDay() + 1); // 周一
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // 周日

            // 按项目分组统计
            const projectStats = {};
            filteredTasks.forEach(task => {
                const project = task.project || '未分类';
                if (!projectStats[project]) {
                    projectStats[project] = {
                        total: 0,
                        completed: 0,
                        pending: 0,
                        overdue: 0
                    };
                }
                projectStats[project].total++;
                if (task.completed) {
                    projectStats[project].completed++;
                } else {
                    projectStats[project].pending++;
                    // 检查是否逾期
                    if (task.dueDate) {
                        const dueDate = new Date(task.dueDate);
                        if (dueDate < new Date()) {
                            projectStats[project].overdue++;
                        }
                    }
                }
            });

            // 构建提示词
            const prompt = `请根据以下任务信息生成一份专业的工作周报：

周报时间: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}
${projectFilter ? `项目: ${projectFilter}` : ''}

项目进展统计:
${Object.entries(projectStats).map(([project, stats]) => 
    `${project}: 总计${stats.total}项，已完成${stats.completed}项，进行中${stats.pending}项${stats.overdue > 0 ? `，逾期${stats.overdue}项` : ''}`
).join('\n')}

任务详情:
已完成任务:
${filteredTasks.filter(task => task.completed).map(task => 
    `- ${task.title} (${task.project}) - 负责人: ${task.assignee || '未指定'}`
).join('\n')}

进行中任务:
${filteredTasks.filter(task => !task.completed).map(task => 
    `- ${task.title} (${task.project}) - 负责人: ${task.assignee || '未指定'} - 截止: ${task.dueDate || '未设定'}`
).join('\n')}

请生成一份结构完整、分析深入的工作周报，包含：
1. 本周工作概述
2. 各项目进展情况
3. 完成率和效率分析
4. 存在的问题和挑战
5. 下周工作重点
6. 资源需求和建议

请用数据说话，突出关键成果和改进方向。`;

            const messages = [
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const result = await this.generateText(messages);
            
            if (result.success) {
                console.log('✅ 周报生成成功');
                return {
                    success: true,
                    report: result.content,
                    type: 'weekly',
                    date: date,
                    project: projectFilter,
                    weekRange: {
                        start: weekStart.toLocaleDateString(),
                        end: weekEnd.toLocaleDateString()
                    },
                    stats: {
                        total: filteredTasks.length,
                        completed: filteredTasks.filter(task => task.completed).length,
                        pending: filteredTasks.filter(task => !task.completed).length,
                        projects: Object.keys(projectStats).length
                    }
                };
            } else {
                return result;
            }
        } catch (error) {
            console.error('❌ 生成周报失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 生成任务分析报告
    async generateTaskAnalysis(tasks) {
        try {
            console.log('生成任务分析报告...', { tasksCount: tasks.length });

            // 统计分析
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.completed).length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

            // 项目分布
            const projectDistribution = {};
            tasks.forEach(task => {
                const project = task.project || '未分类';
                projectDistribution[project] = (projectDistribution[project] || 0) + 1;
            });

            // 逾期任务
            const overdueTasks = tasks.filter(task => {
                if (!task.dueDate || task.completed) return false;
                return new Date(task.dueDate) < new Date();
            });

            const prompt = `请根据以下任务数据生成一份深度分析报告：

任务总览:
- 总任务数: ${totalTasks}
- 已完成: ${completedTasks}
- 完成率: ${completionRate}%
- 逾期任务: ${overdueTasks.length}

项目分布:
${Object.entries(projectDistribution).map(([project, count]) => 
    `- ${project}: ${count}项任务`
).join('\n')}

请生成一份专业的任务分析报告，包含：
1. 整体执行情况评估
2. 项目优先级建议
3. 效率提升建议
4. 风险识别和应对
5. 资源配置优化建议

请提供具体可行的改进措施。`;

            const messages = [
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const result = await this.generateText(messages);
            
            if (result.success) {
                console.log('✅ 任务分析报告生成成功');
                return {
                    success: true,
                    report: result.content,
                    type: 'analysis',
                    stats: {
                        total: totalTasks,
                        completed: completedTasks,
                        completionRate: completionRate,
                        overdue: overdueTasks.length,
                        projects: Object.keys(projectDistribution).length
                    }
                };
            } else {
                return result;
            }
        } catch (error) {
            console.error('❌ 生成任务分析报告失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 创建全局实例
window.doubaoAPI = new DoubaoAPI();
console.log('✅ 豆包大模型API模块已加载');
