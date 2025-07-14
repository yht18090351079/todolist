// AI对话系统
class AiChatSystem {
    constructor() {
        this.messages = []; // 对话历史
        this.currentService = null; // 当前服务类型
        this.isTyping = false; // AI是否正在输入
        this.config = {
            API_KEY: 'e90111f2-f6a4-40c3-a657-b8383007166f',
            MODEL: 'doubao-seed-1.6-250615',
            API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
        };
    }

    // 获取代理URL
    getProxyUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3002';
        } else {
            return 'https://tasklit.netlify.app/.netlify/functions';
        }
    }

    // 选择AI服务
    selectService(serviceType) {
        this.currentService = serviceType;
        this.messages = []; // 清空历史消息
        
        // 添加系统消息
        const systemMessage = this.getSystemMessage(serviceType);
        this.messages.push(systemMessage);
        
        // 添加欢迎消息
        const welcomeMessage = this.getWelcomeMessage(serviceType);
        this.addMessage('ai', welcomeMessage);
        
        // 如果是自动服务，立即开始生成
        if (['daily', 'weekly', 'analysis'].includes(serviceType)) {
            setTimeout(() => {
                this.generateAutoResponse(serviceType);
            }, 1000);
        }
    }

    // 获取系统消息
    getSystemMessage(serviceType) {
        const taskData = this.getTaskContext();
        
        const systemMessages = {
            daily: `你是一个专业的工作助手，专门帮助用户生成日报。请基于以下任务数据生成今天的工作日报：\n\n${taskData}`,
            weekly: `你是一个专业的工作助手，专门帮助用户生成周报。请基于以下任务数据生成本周的工作周报：\n\n${taskData}`,
            analysis: `你是一个专业的数据分析师，专门分析工作任务完成情况。请基于以下任务数据进行深度分析：\n\n${taskData}`,
            planning: `你是一个专业的工作规划师，帮助用户制定工作计划。当前任务情况：\n\n${taskData}`,
            custom: `你是一个专业的工作助手，可以回答任何工作相关的问题。当前任务情况：\n\n${taskData}`
        };
        
        return {
            role: 'system',
            content: systemMessages[serviceType] || systemMessages.custom
        };
    }

    // 获取任务上下文
    getTaskContext() {
        const tasks = window.taskManager?.tasks || [];
        const completedTasks = tasks.filter(t => t.completed);
        const pendingTasks = tasks.filter(t => !t.completed);
        
        return `
当前任务总数: ${tasks.length}
已完成任务: ${completedTasks.length}
进行中任务: ${pendingTasks.length}

最近完成的任务:
${completedTasks.slice(-5).map(t => `- ${t.title} (${t.project})`).join('\n')}

进行中的重要任务:
${pendingTasks.slice(0, 5).map(t => `- ${t.title} (${t.project}) - 截止: ${t.dueDate || '未设定'}`).join('\n')}
        `.trim();
    }

    // 获取欢迎消息
    getWelcomeMessage(serviceType) {
        const welcomeMessages = {
            daily: '👋 您好！我来帮您生成今天的工作日报。让我分析一下您今天完成的任务...',
            weekly: '👋 您好！我来帮您生成本周的工作周报。让我分析一下您本周的工作情况...',
            analysis: '👋 您好！我来帮您分析任务完成情况。让我深入分析一下您的工作数据...',
            planning: '👋 您好！我来帮您制定工作计划。请告诉我您需要规划什么？',
            custom: '👋 您好！我是您的AI工作助手，有什么可以帮助您的吗？'
        };
        
        return welcomeMessages[serviceType] || welcomeMessages.custom;
    }

    // 自动生成响应
    async generateAutoResponse(serviceType) {
        const prompts = {
            daily: '请基于我提供的任务数据，生成一份详细的今日工作日报。',
            weekly: '请基于我提供的任务数据，生成一份详细的本周工作周报。',
            analysis: '请深入分析我的任务完成情况，包括效率、趋势和改进建议。'
        };
        
        const prompt = prompts[serviceType];
        if (prompt) {
            await this.sendMessage(prompt, false); // false表示不显示用户消息
        }
    }

    // 发送消息
    async sendMessage(content, showUserMessage = true) {
        if (this.isTyping) return;
        
        if (showUserMessage) {
            this.addMessage('user', content);
        }
        
        // 添加到对话历史
        this.messages.push({
            role: 'user',
            content: content
        });
        
        // 显示AI正在输入
        this.showTyping();
        
        try {
            // 调用AI API
            const response = await this.callAI();
            
            // 隐藏输入状态
            this.hideTyping();
            
            if (response.success) {
                // 流式显示AI回复
                await this.streamAiResponse(response.content);
                
                // 添加到对话历史
                this.messages.push({
                    role: 'assistant',
                    content: response.content
                });
            } else {
                this.addMessage('ai', '抱歉，我遇到了一些问题，请稍后再试。');
            }
        } catch (error) {
            this.hideTyping();
            console.error('AI调用失败:', error);
            this.addMessage('ai', '抱歉，网络连接出现问题，请稍后再试。');
        }
    }

    // 调用AI API
    async callAI() {
        try {
            const proxyUrl = this.getProxyUrl();
            
            const response = await fetch(`${proxyUrl}/doubao-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: this.messages
                })
            });

            if (!response.ok) {
                throw new Error(`请求失败: ${response.status}`);
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
            console.error('AI API调用失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 添加消息到界面
    addMessage(sender, content) {
        const messagesContainer = document.getElementById('chatMessages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = `chat-avatar ${sender}`;
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.textContent = content;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return bubble;
    }

    // 流式显示AI回复
    async streamAiResponse(content) {
        const bubble = this.addMessage('ai', '');
        bubble.classList.add('typing');
        
        let displayedContent = '';
        const words = content.split('');
        
        for (let i = 0; i < words.length; i++) {
            displayedContent += words[i];
            bubble.textContent = displayedContent;
            
            // 自动滚动
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // 动态调整速度
            const delay = /[。！？，；：]/.test(words[i]) ? 100 : 20;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        bubble.classList.remove('typing');
    }

    // 显示AI正在输入
    showTyping() {
        this.isTyping = true;
        const bubble = this.addMessage('ai', '正在思考...');
        bubble.classList.add('typing');
        bubble.id = 'typingIndicator';
        
        // 禁用输入
        document.getElementById('chatInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
    }

    // 隐藏输入状态
    hideTyping() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.parentElement.remove();
        }
        
        // 启用输入
        document.getElementById('chatInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
    }

    // 清空对话
    clearChat() {
        this.messages = [];
        document.getElementById('chatMessages').innerHTML = '';
        
        // 重新添加系统消息和欢迎消息
        if (this.currentService) {
            this.selectService(this.currentService);
        }
    }
}

// 全局AI对话系统实例
window.aiChatSystem = new AiChatSystem();
