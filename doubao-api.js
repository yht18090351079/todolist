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



    // 调用豆包API（直接调用模式）
    async callAPI(messages) {
        try {
            console.log('🤖 直接调用豆包API...');

            const response = await fetch(this.config.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.API_KEY}`
                },
                body: JSON.stringify({
                    model: this.config.MODEL,
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`豆包API调用失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ 豆包API调用成功');

            return {
                success: true,
                content: data.choices[0].message.content
            };
        } catch (error) {
            console.error('❌ 豆包API调用失败:', error);

            // 如果是CORS错误或网络错误，返回降级内容
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.log('⚠️ 网络问题，使用降级模式生成报告');
                return this.generateFallbackReport(messages);
            }

            return {
                success: false,
                error: error.message
            };
        }
    }



    // 生成日报
    async generateDailyReport(tasks, targetDate = null) {
        try {
            // 🔄 每次生成日报都清空对话历史，确保全新对话
            this.clearHistory();
            console.log('🆕 开始全新的日报对话');

            const today = targetDate || new Date().toISOString().split('T')[0];
            console.log('📅 生成日报，目标日期:', today);
            console.log('📋 总任务数:', tasks.length);
            console.log('✅ 已完成任务数:', tasks.filter(t => t.completed).length);

            // 显示所有已完成任务的时间信息
            const completedTasks = tasks.filter(t => t.completed);
            console.log('🕐 所有已完成任务的时间信息:');
            completedTasks.forEach(task => {
                const completedTime = task.completedTime || task.completeTime || task.完成时间;
                console.log(`  - "${task.title}": ${completedTime} (类型: ${typeof completedTime})`);
            });

            // 筛选当天完成的任务
            const todayCompletedTasks = this.filterTasksByDate(tasks, today);
            console.log('✅ 找到当天完成的任务:', todayCompletedTasks.length, '个');

            if (todayCompletedTasks.length === 0) {
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
            const prompt = this.buildDailyReportPrompt(todayCompletedTasks, today);
            
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
                    tasks: todayCompletedTasks,
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
            // 🔄 每次生成周报都清空对话历史，确保全新对话
            this.clearHistory();
            console.log('🆕 开始全新的周报对话');

            const today = targetDate ? new Date(targetDate) : new Date();
            const { startOfWeek, endOfWeek } = this.getWeekRange(today);

            console.log('📊 生成周报，时间范围:', startOfWeek, '到', endOfWeek);
            console.log('📋 总任务数:', tasks.length);
            console.log('✅ 已完成任务数:', tasks.filter(t => t.completed).length);

            // 显示所有已完成任务的时间信息
            const completedTasks = tasks.filter(t => t.completed);
            console.log('🕐 所有已完成任务的时间信息:');
            completedTasks.forEach(task => {
                const completedTime = task.completedTime || task.completeTime || task.完成时间;
                console.log(`  - "${task.title}": ${completedTime} (类型: ${typeof completedTime})`);
            });

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
                console.log(`  📅 解析时间戳: ${completedTime} → ${completedDate.toLocaleString()}`);
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
                        console.log(`  📅 解析中文格式: ${completedTime} → ${completedDate.toLocaleString()}`);
                    }
                } else {
                    console.log(`  📅 解析字符串: ${completedTime} → ${completedDate.toLocaleString()}`);
                }
            } else {
                console.log(`  ❌ 不支持的时间格式: ${typeof completedTime} - ${completedTime}`);
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
        // 创建周开始和结束的时间点
        const start = new Date(startOfWeek);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endOfWeek);
        end.setHours(23, 59, 59, 999);

        console.log(`📊 筛选周范围: ${start.toLocaleString()} - ${end.toLocaleString()}`);

        return tasks.filter(task => {
            if (!task.completed) return false;

            let completedTime = task.completedTime || task.completeTime || task.完成时间;
            if (!completedTime) {
                console.log(`  ⚠️ 任务 "${task.title}" 没有完成时间`);
                return false;
            }

            let completedDate;
            if (typeof completedTime === 'number') {
                completedDate = new Date(completedTime);
                console.log(`  📅 解析时间戳: ${completedTime} → ${completedDate.toLocaleString()}`);
            } else if (typeof completedTime === 'string') {
                completedDate = new Date(completedTime);

                // 如果解析失败，尝试中文格式
                if (isNaN(completedDate.getTime())) {
                    const match = completedTime.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                    if (match) {
                        const [, year, month, day, hour, minute, second] = match;
                        completedDate = new Date(year, month - 1, day, hour, minute, second);
                        console.log(`  📅 解析中文格式: ${completedTime} → ${completedDate.toLocaleString()}`);
                    }
                } else {
                    console.log(`  📅 解析字符串: ${completedTime} → ${completedDate.toLocaleString()}`);
                }
            } else {
                console.log(`  ❌ 不支持的时间格式: ${typeof completedTime} - ${completedTime}`);
                return false;
            }

            if (isNaN(completedDate.getTime())) {
                console.log(`  ❌ 时间解析失败: ${completedTime}`);
                return false;
            }

            const isInRange = completedDate >= start && completedDate <= end;

            console.log(`  🔍 任务 "${task.title}": ${completedDate.toLocaleString()} ${isInRange ? '✅ 在范围内' : '❌ 不在范围内'}`);

            return isInRange;
        });
    }

    // 获取周范围
    getWeekRange(date) {
        const d = new Date(date);
        const day = d.getDay();

        // 计算本周一的日期（周一为一周的开始）
        const mondayOffset = day === 0 ? -6 : 1 - day; // 如果是周日，往前推6天到周一

        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() + mondayOffset);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        console.log('📅 周范围计算详情:');
        console.log('  输入日期:', d.toLocaleDateString());
        console.log('  星期几:', day, '(0=周日, 1=周一, ..., 6=周六)');
        console.log('  周一偏移:', mondayOffset);
        console.log('  周开始:', startOfWeek.toLocaleDateString(), startOfWeek.toLocaleTimeString());
        console.log('  周结束:', endOfWeek.toLocaleDateString(), endOfWeek.toLocaleTimeString());

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

        prompt += `\n请生成一份结构清晰、分点展示的工作日报：

**格式要求：**
1. 各部分内容必须分点列示，使用 • 或数字编号
2. 每个要点简洁明了，避免冗长段落
3. 专业、简洁、条理清晰

**内容结构（仅包含以下5个部分）：**
1. **工作概述** - 用一段话总结今日工作整体情况
2. **项目进展** - 分点说明各项目推进情况
3. **重要成果** - 分点展示关键成果和亮点
4. **问题与解决** - 如有问题，分点说明及解决方案；如无问题，说明工作顺利
5. **下周计划** - 分点列示下周的工作安排和重点

**语言要求：**
- 专业、简洁、条理清晰
- 多使用分点格式，避免大段文字
- 突出数据和具体成果
- 体现工作价值和效率`;

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

        prompt += `\n请生成一份结构清晰、分点展示的工作周报：

**格式要求：**
1. 各部分内容必须分点列示，使用 • 或数字编号
2. 每个要点简洁明了，突出数据和关键信息
3. 专业、简洁、数据化表达

**内容结构（仅包含以下5个部分）：**
1. **工作概述** - 用一段话总结本周工作整体情况和主要成果
2. **项目进展** - 分点展示各项目的具体进展情况
3. **重要成果** - 分点列示本周的关键成果和亮点
4. **问题与解决** - 如有问题，分点说明及解决方案；如无问题，说明工作顺利
5. **下周计划** - 分点列示下周的工作重点和目标

**语言要求：**
- 专业、简洁、数据化表达
- 多使用分点格式，避免大段文字
- 突出效率指标和具体成果
- 体现工作价值和团队贡献
- 提供有价值的分析和建议`;

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

    // 生成降级报告（当API超时时使用）
    generateFallbackReport(messages) {
        console.log('🔄 生成降级报告...');

        // 分析消息内容判断报告类型
        const userMessage = messages[messages.length - 1]?.content || '';
        const isDaily = userMessage.includes('日报') || userMessage.includes('今日');
        const isWeekly = userMessage.includes('周报') || userMessage.includes('本周');

        let fallbackContent = '';

        if (isDaily) {
            const today = new Date().toLocaleDateString('zh-CN');
            fallbackContent = `# 📅 工作日报 - ${today}

## 今日工作总结
由于网络原因，无法连接到AI服务，以下为基于任务数据的简要总结：

## 主要工作内容
- 按计划推进各项任务
- 保持良好的工作节奏
- 积极配合团队协作

## 工作建议
- 继续保持当前的工作状态
- 关注重要任务的进展
- 加强团队沟通协作

## 备注
*此为网络异常时的降级报告，建议稍后重试以获得AI生成的详细报告。*`;
        } else if (isWeekly) {
            const today = new Date();
            const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
            const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 7));

            fallbackContent = `# 📊 工作周报 - ${weekStart.toLocaleDateString('zh-CN')} 至 ${weekEnd.toLocaleDateString('zh-CN')}

## 本周工作总结
由于网络原因，无法连接到AI服务，以下为基于任务数据的简要总结：

## 主要成果
- 本周任务执行情况良好
- 团队协作效果显著
- 项目进展符合预期

## 工作效率
- 任务完成情况：按计划进行
- 工作质量：保持稳定
- 团队配合：良好

## 下周计划
- 继续推进重点项目
- 优化工作流程
- 加强技能提升

## 备注
*此为网络异常时的降级报告，建议稍后重试以获得AI生成的详细报告。*`;
        } else {
            fallbackContent = `# 📋 工作报告

## 系统提示
由于网络连接问题，暂时无法提供AI生成的详细报告。

## 建议
- 请检查网络连接状态
- 稍后重试生成报告
- 如问题持续存在，请联系技术支持

*此为降级模式下的基础报告。*`;
        }

        return {
            success: true,
            content: fallbackContent
        };
    }

    // 生成降级报告（当API调用失败时使用）
    generateFallbackReport(messages) {
        console.log('🔄 生成降级报告...');

        // 分析消息内容判断报告类型
        const userMessage = messages[messages.length - 1]?.content || '';
        const isDaily = userMessage.includes('日报') || userMessage.includes('今日');
        const isWeekly = userMessage.includes('周报') || userMessage.includes('本周');

        let fallbackContent = '';

        if (isDaily) {
            const today = new Date().toLocaleDateString('zh-CN');
            fallbackContent = `# 📅 工作日报 - ${today}

## 今日工作总结
由于网络原因，无法连接到AI服务，以下为基于任务数据的简要总结：

## 主要工作内容
- 按计划推进各项任务
- 保持良好的工作节奏
- 积极配合团队协作

## 工作建议
- 继续保持当前的工作状态
- 关注重要任务的进展
- 加强团队沟通协作

## 备注
*此为网络异常时的降级报告，建议稍后重试以获得AI生成的详细报告。*`;
        } else if (isWeekly) {
            const today = new Date();
            const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
            const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 7));

            fallbackContent = `# 📊 工作周报 - ${weekStart.toLocaleDateString('zh-CN')} 至 ${weekEnd.toLocaleDateString('zh-CN')}

## 本周工作总结
由于网络原因，无法连接到AI服务，以下为基于任务数据的简要总结：

## 主要成果
- 本周任务执行情况良好
- 团队协作效果显著
- 项目进展符合预期

## 工作效率
- 任务完成情况：按计划进行
- 工作质量：保持稳定
- 团队配合：良好

## 下周计划
- 继续推进重点项目
- 优化工作流程
- 加强技能提升

## 备注
*此为网络异常时的降级报告，建议稍后重试以获得AI生成的详细报告。*`;
        } else {
            fallbackContent = `# 📋 工作报告

## 系统提示
由于网络连接问题，暂时无法提供AI生成的详细报告。

## 建议
- 请检查网络连接状态
- 稍后重试生成报告
- 如问题持续存在，请联系技术支持

*此为降级模式下的基础报告。*`;
        }

        return {
            success: true,
            content: fallbackContent
        };
    }

    // 清空对话历史
    clearHistory() {
        this.conversationHistory = [];
        console.log('🗑️ 对话历史已清空 - 确保每次都是全新的AI对话');
    }

    // 获取对话历史
    getHistory() {
        return this.conversationHistory;
    }
}

// 全局实例
window.doubaoAPI = new DoubaoAPI();
