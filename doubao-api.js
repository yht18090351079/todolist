// 豆包AI API服务
class DoubaoAPI {
    constructor() {
        this.config = {
            API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            API_KEY: 'e90111f2-f6a4-40c3-a657-b8383007166f',
            MODEL: 'doubao-seed-1-6-250615'
        };
        this.conversationHistory = []; // 上下文记忆
    }

    // 获取代理URL
    getProxyUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3002';
        } else {
            return 'https://tasklit.netlify.app/.netlify/functions';
        }
    }

    // 调用豆包API
    async callAPI(messages) {
        try {
            const proxyUrl = this.getProxyUrl();
            
            const response = await fetch(`${proxyUrl}/doubao-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.MODEL,
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                return {
                    success: true,
                    content: data.data.choices[0].message.content
                };
            } else {
                throw new Error(data.error || '未知错误');
            }
        } catch (error) {
            console.error('豆包API调用失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 生成日报
    async generateDailyReport(tasks, targetDate = null) {
        try {
            const today = targetDate || new Date().toISOString().split('T')[0];
            console.log('📅 生成日报，目标日期:', today);

            // 筛选当天完成的任务
            const completedTasks = this.filterTasksByDate(tasks, today);
            console.log('✅ 找到当天完成的任务:', completedTasks.length, '个');

            if (completedTasks.length === 0) {
                return {
                    success: true,
                    content: `# 📅 工作日报 - ${today}

## 今日工作总结
今天暂无已完成的任务记录。

## 建议
- 确保及时更新任务完成状态
- 记录工作进展和成果
- 为明天制定清晰的工作计划

*注：基于系统中的任务完成记录生成*`
                };
            }

            // 构建提示词
            const prompt = this.buildDailyReportPrompt(completedTasks, today);
            
            // 构建消息
            const messages = [
                {
                    role: 'system',
                    content: '你是一个专业的工作助手，擅长根据任务完成情况生成高质量的工作日报。请用专业、简洁的语言，突出重点工作和关键进展。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];

            // 调用API
            const result = await this.callAPI(messages);
            
            if (result.success) {
                // 保存到对话历史
                this.conversationHistory.push({
                    type: 'daily_report',
                    date: today,
                    tasks: completedTasks,
                    content: result.content,
                    timestamp: Date.now()
                });
                
                console.log('✅ 日报生成成功');
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ 日报生成失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 生成周报
    async generateWeeklyReport(tasks, targetDate = null) {
        try {
            const today = targetDate ? new Date(targetDate) : new Date();
            const { startOfWeek, endOfWeek } = this.getWeekRange(today);
            
            console.log('📊 生成周报，时间范围:', startOfWeek, '到', endOfWeek);

            // 筛选本周完成的任务
            const weeklyTasks = this.filterTasksByWeek(tasks, startOfWeek, endOfWeek);
            console.log('✅ 找到本周完成的任务:', weeklyTasks.length, '个');

            if (weeklyTasks.length === 0) {
                return {
                    success: true,
                    content: `# 📊 工作周报 - ${startOfWeek} 至 ${endOfWeek}

## 本周工作总结
本周暂无已完成的任务记录。

## 建议
- 确保及时更新任务完成状态
- 记录工作进展和成果
- 为下周制定详细的工作计划

*注：基于系统中的任务完成记录生成*`
                };
            }

            // 构建提示词
            const prompt = this.buildWeeklyReportPrompt(weeklyTasks, startOfWeek, endOfWeek);
            
            // 构建消息
            const messages = [
                {
                    role: 'system',
                    content: '你是一个专业的工作助手，擅长根据任务完成情况生成高质量的工作周报。请用专业、简洁的语言，突出重点工作和关键进展，并提供有价值的分析和建议。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];

            // 调用API
            const result = await this.callAPI(messages);
            
            if (result.success) {
                // 保存到对话历史
                this.conversationHistory.push({
                    type: 'weekly_report',
                    startDate: startOfWeek,
                    endDate: endOfWeek,
                    tasks: weeklyTasks,
                    content: result.content,
                    timestamp: Date.now()
                });
                
                console.log('✅ 周报生成成功');
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ 周报生成失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 筛选指定日期完成的任务
    filterTasksByDate(tasks, targetDate) {
        const target = new Date(targetDate);
        const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
        const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1);

        console.log(`🔍 筛选日期: ${targetDate}, 范围: ${startOfDay.toLocaleString()} - ${endOfDay.toLocaleString()}`);

        return tasks.filter(task => {
            if (!task.completed) return false;

            // 检查完成时间字段（支持多种格式）
            let completedTime = task.completedTime || task.completeTime || task.完成时间;

            if (!completedTime) {
                console.log(`⚠️ 任务 "${task.title}" 没有完成时间`);
                return false;
            }

            let completedDate;
            if (typeof completedTime === 'number') {
                // 时间戳格式
                completedDate = new Date(completedTime);
            } else if (typeof completedTime === 'string') {
                // 字符串格式，尝试解析
                completedDate = new Date(completedTime);

                // 如果解析失败，尝试中文格式
                if (isNaN(completedDate.getTime())) {
                    // 处理中文格式：2025/07/14 02:33:00
                    const match = completedTime.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                    if (match) {
                        const [, year, month, day, hour, minute, second] = match;
                        completedDate = new Date(year, month - 1, day, hour, minute, second);
                    }
                }
            } else {
                return false;
            }

            if (isNaN(completedDate.getTime())) {
                console.log(`❌ 任务 "${task.title}" 完成时间格式无效: ${completedTime}`);
                return false;
            }

            const isInRange = completedDate >= startOfDay && completedDate < endOfDay;

            if (isInRange) {
                console.log(`✅ 找到匹配任务: "${task.title}" 完成于 ${completedDate.toLocaleString()}`);
            }

            return isInRange;
        });
    }

    // 筛选指定周完成的任务
    filterTasksByWeek(tasks, startOfWeek, endOfWeek) {
        const start = new Date(startOfWeek);
        const end = new Date(endOfWeek);
        end.setDate(end.getDate() + 1); // 包含结束日期

        console.log(`📊 筛选周范围: ${startOfWeek} - ${endOfWeek}`);

        return tasks.filter(task => {
            if (!task.completed) return false;

            let completedTime = task.completedTime || task.completeTime || task.完成时间;
            if (!completedTime) return false;

            let completedDate;
            if (typeof completedTime === 'number') {
                completedDate = new Date(completedTime);
            } else if (typeof completedTime === 'string') {
                completedDate = new Date(completedTime);

                // 如果解析失败，尝试中文格式
                if (isNaN(completedDate.getTime())) {
                    const match = completedTime.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                    if (match) {
                        const [, year, month, day, hour, minute, second] = match;
                        completedDate = new Date(year, month - 1, day, hour, minute, second);
                    }
                }
            } else {
                return false;
            }

            if (isNaN(completedDate.getTime())) return false;

            const isInRange = completedDate >= start && completedDate < end;

            if (isInRange) {
                console.log(`✅ 周报匹配任务: "${task.title}" 完成于 ${completedDate.toLocaleString()}`);
            }

            return isInRange;
        });
    }

    // 获取周范围
    getWeekRange(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
        
        const startOfWeek = new Date(d.setDate(diff));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return {
            startOfWeek: startOfWeek.toISOString().split('T')[0],
            endOfWeek: endOfWeek.toISOString().split('T')[0]
        };
    }

    // 构建日报提示词
    buildDailyReportPrompt(tasks, date) {
        const tasksByProject = this.groupTasksByProject(tasks);
        
        let prompt = `请根据以下任务完成情况，生成一份专业的工作日报：

📅 日期：${date}
✅ 完成任务总数：${tasks.length}个

## 任务完成详情：
`;

        Object.entries(tasksByProject).forEach(([project, projectTasks]) => {
            prompt += `\n### ${project} (${projectTasks.length}个任务)\n`;
            projectTasks.forEach(task => {
                const completedTime = this.formatCompletedTime(task);
                prompt += `- ${task.title}`;
                if (task.assignee) prompt += ` (负责人: ${task.assignee})`;
                if (completedTime) prompt += ` [完成时间: ${completedTime}]`;
                prompt += '\n';
            });
        });

        prompt += `\n请生成一份结构清晰、内容详实的工作日报，包含：
1. 今日工作总结
2. 主要成果和亮点
3. 各项目进展情况
4. 遇到的问题和解决方案
5. 明日工作计划

请用专业、简洁的语言，突出重点工作和关键进展。`;

        return prompt;
    }

    // 构建周报提示词
    buildWeeklyReportPrompt(tasks, startDate, endDate) {
        const tasksByProject = this.groupTasksByProject(tasks);
        const tasksByDay = this.groupTasksByDay(tasks);
        
        let prompt = `请根据以下任务完成情况，生成一份专业的工作周报：

📊 时间范围：${startDate} 至 ${endDate}
✅ 完成任务总数：${tasks.length}个

## 按项目分类：
`;

        Object.entries(tasksByProject).forEach(([project, projectTasks]) => {
            prompt += `\n### ${project} (${projectTasks.length}个任务)\n`;
            projectTasks.forEach(task => {
                prompt += `- ${task.title}`;
                if (task.assignee) prompt += ` (负责人: ${task.assignee})`;
                prompt += '\n';
            });
        });

        prompt += `\n## 按日期分布：\n`;
        Object.entries(tasksByDay).forEach(([date, dayTasks]) => {
            prompt += `${date}: ${dayTasks.length}个任务\n`;
        });

        prompt += `\n请生成一份结构完整、分析深入的工作周报，包含：
1. 本周工作概述
2. 各项目进展情况
3. 工作效率分析
4. 主要成果和亮点
5. 遇到的问题和解决方案
6. 下周工作计划和重点

请用专业、简洁的语言，提供有价值的分析和建议。`;

        return prompt;
    }

    // 按项目分组任务
    groupTasksByProject(tasks) {
        return tasks.reduce((groups, task) => {
            const project = task.project || '未分类';
            if (!groups[project]) groups[project] = [];
            groups[project].push(task);
            return groups;
        }, {});
    }

    // 按日期分组任务
    groupTasksByDay(tasks) {
        return tasks.reduce((groups, task) => {
            const completedTime = task.completedTime || task.completeTime || task.完成时间;
            if (!completedTime) return groups;
            
            let date;
            if (typeof completedTime === 'number') {
                date = new Date(completedTime).toISOString().split('T')[0];
            } else {
                date = new Date(completedTime).toISOString().split('T')[0];
            }
            
            if (!groups[date]) groups[date] = [];
            groups[date].push(task);
            return groups;
        }, {});
    }

    // 格式化完成时间
    formatCompletedTime(task) {
        const completedTime = task.completedTime || task.completeTime || task.完成时间;
        if (!completedTime) return null;

        let date;
        if (typeof completedTime === 'number') {
            date = new Date(completedTime);
        } else if (typeof completedTime === 'string') {
            date = new Date(completedTime);

            // 如果解析失败，尝试中文格式
            if (isNaN(date.getTime())) {
                const match = completedTime.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (match) {
                    const [, year, month, day, hour, minute, second] = match;
                    date = new Date(year, month - 1, day, hour, minute, second);
                }
            }
        } else {
            return null;
        }

        if (isNaN(date.getTime())) return null;

        return date.toLocaleString('zh-CN');
    }

    // 清空对话历史
    clearHistory() {
        this.conversationHistory = [];
        console.log('🗑️ 对话历史已清空');
    }

    // 获取对话历史
    getHistory() {
        return this.conversationHistory;
    }
}

// 全局实例
window.doubaoAPI = new DoubaoAPI();
