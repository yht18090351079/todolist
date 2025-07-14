// 主应用逻辑
class TaskManager {
    constructor() {
        this.tasks = [];
        this.projects = [];
        this.currentView = 'list';
        this.currentProject = ''; // 当前选中的项目
        this.filters = {
            project: '',
            status: ['true', 'false'], // 完成状态
            priority: ['urgent', 'normal', 'overdue'], // 紧急程度
            search: ''
        };
        this.currentEditingTask = null;
        
        this.init();
    }

    // 初始化应用
    async init() {
        console.log('🔧 初始化任务管理系统...');

        try {
            // 绑定事件监听器
            console.log('📎 绑定事件监听器...');
            this.bindEventListeners();

            // 检查连接状态
            console.log('🔗 检查连接状态...');
            await this.checkConnectionStatus();

            // 加载数据
            console.log('📊 开始加载数据...');
            await this.loadData();

            console.log('✅ 任务管理系统初始化完成');
        } catch (error) {
            console.error('❌ 初始化过程中出错:', error);
            throw error;
        }
    }

    // 绑定事件监听器
    bindEventListeners() {
        // 同步数据按钮
        document.getElementById('syncBtn').addEventListener('click', () => this.syncData());

        // 日报按钮
        document.getElementById('dailyReportBtn').addEventListener('click', () => this.generateDailyReport());

        // 周报按钮
        document.getElementById('weeklyReportBtn').addEventListener('click', () => this.generateWeeklyReport());
        



        
        // 新增任务按钮
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());
        
        // 视图切换
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // 搜索
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.renderTasks();
        });
        
        // 项目筛选
        document.getElementById('projectFilter').addEventListener('change', (e) => {
            this.filters.project = e.target.value;
            this.renderTasks();
        });
        
        // 状态筛选
        document.querySelectorAll('.sidebar input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateFilters());
        });
        
        // 任务表单相关
        document.getElementById('closeModal').addEventListener('click', () => this.hideTaskModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideTaskModal());
        document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());

        // 报告模态框事件
        document.getElementById('closeReportModal').addEventListener('click', () => this.hideReportModal());
        document.getElementById('closeReportBtn').addEventListener('click', () => this.hideReportModal());
        document.getElementById('copyReportBtn').addEventListener('click', () => this.copyReport());
        

        
        // 模态框外部点击关闭
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.hideTaskModal();
        });


        // 初始化项目输入控件
        this.initProjectInput();
    }



    // 初始化项目输入控件
    initProjectInput() {
        const container = document.querySelector('.project-input-container');
        const projectSelect = document.getElementById('taskProjectSelect');
        const projectInput = document.getElementById('taskProject');
        const toggleBtn = document.getElementById('toggleProjectInput');

        // 设置初始状态为选择模式
        container.classList.add('select-mode');

        // 切换输入方式
        toggleBtn.addEventListener('click', () => {
            if (container.classList.contains('select-mode')) {
                // 切换到输入模式
                container.classList.remove('select-mode');
                container.classList.add('input-mode');
                projectInput.focus();
                toggleBtn.title = '切换到选择模式';
            } else {
                // 切换到选择模式
                container.classList.remove('input-mode');
                container.classList.add('select-mode');
                projectSelect.focus();
                toggleBtn.title = '切换到输入模式';
            }
        });

        // 项目选择变化时同步到输入框
        projectSelect.addEventListener('change', () => {
            if (projectSelect.value) {
                projectInput.value = projectSelect.value;
            }
        });

        // 输入框变化时清除选择
        projectInput.addEventListener('input', () => {
            projectSelect.value = '';
        });

        // 更新项目选项
        this.updateProjectOptions();
    }

    // 更新项目选项
    updateProjectOptions() {
        const projectSelect = document.getElementById('taskProjectSelect');

        // 获取所有唯一的项目名称
        const projects = [...new Set(this.tasks.map(task => task.project).filter(p => p))].sort();

        // 清空现有选项（保留默认选项）
        projectSelect.innerHTML = '<option value="">选择已有项目...</option>';

        // 添加项目选项
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectSelect.appendChild(option);
        });

        console.log('✅ 项目选项已更新，共', projects.length, '个项目');
    }

    // 检查连接状态
    async checkConnectionStatus() {
        try {
            // 更新状态为检查中
            this.updateConnectionStatus('checking', '检查连接...');

            // 检查飞书API健康状态
            const healthResult = await window.feishuTaskAPI.checkHealth();

            if (healthResult.success) {
                this.updateConnectionStatus('connected', '服务正常');
            } else {
                this.updateConnectionStatus('disconnected', '服务异常');
            }
        } catch (error) {
            console.error('连接状态检查失败:', error);
            this.updateConnectionStatus('disconnected', '连接失败');
        }
    }

    // 更新连接状态显示
    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');

        // 移除所有状态类
        statusElement.classList.remove('connected', 'disconnected', 'checking');

        // 添加当前状态类
        statusElement.classList.add(status);

        // 更新文本
        statusElement.querySelector('span').textContent = message;

        // 根据状态更新图标
        const icon = statusElement.querySelector('i');
        switch (status) {
            case 'connected':
                icon.className = 'fas fa-circle';
                break;
            case 'disconnected':
                icon.className = 'fas fa-exclamation-circle';
                break;
            case 'checking':
                icon.className = 'fas fa-circle';
                break;
        }
    }

    // 加载数据
    async loadData() {
        this.showLoading(true);

        try {
            // 从飞书获取任务数据
            const result = await window.feishuTaskAPI.getTasks();

            if (result.success) {
                this.tasks = result.tasks || [];
                console.log('✅ 任务数据加载成功，共', this.tasks.length, '条');

                // 显示数据来源信息
                if (result.source === 'fallback' || result.source === 'local_fallback' || result.source === 'direct_fallback') {
                    console.log('⚠️ 使用备用数据，来源:', result.source);
                    this.showDataSourceInfo(result.source, result.error);
                }

                // 提取项目列表
                this.updateProjectsList();

                // 更新项目选项
                this.updateProjectOptions();

                // 渲染界面
                this.renderTasks();
            } else {
                console.error('❌ 加载任务数据失败:', result.error);
                // 即使失败也尝试使用空数据渲染界面
                this.tasks = [];
                this.renderTasks();
                this.showError('加载数据失败: ' + result.error);
            }
        } catch (error) {
            console.error('❌ 加载数据异常:', error);
            // 异常情况下也要渲染界面
            this.tasks = [];
            this.renderTasks();
            this.showError('加载数据异常: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // 显示数据来源信息
    showDataSourceInfo(source, error) {
        const sourceMessages = {
            'fallback': '当前使用飞书服务器备用数据',
            'local_fallback': '当前使用本地备用数据（代理服务不可用）',
            'direct_fallback': '当前使用本地备用数据（直连模式失败）'
        };

        const message = sourceMessages[source] || '使用备用数据';

        // 创建提示条
        const infoBar = document.createElement('div');
        infoBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #fff3cd;
            color: #856404;
            padding: 0.75rem;
            text-align: center;
            border-bottom: 1px solid #ffeaa7;
            z-index: 1000;
            font-size: 0.875rem;
        `;
        infoBar.innerHTML = `
            <i class="fas fa-info-circle"></i>
            ${message}
            ${error ? `<br><small>原因: ${error}</small>` : ''}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: #856404; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.insertBefore(infoBar, document.body.firstChild);

        // 5秒后自动隐藏
        setTimeout(() => {
            if (infoBar.parentElement) {
                infoBar.remove();
            }
        }, 5000);
    }

    // 显示服务器错误帮助信息
    showServerError(message) {
        const helpModal = document.createElement('div');
        helpModal.className = 'modal show';
        helpModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🔧 后端服务连接问题</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: #721c24; margin-bottom: 0.5rem;">后端服务暂时不可用</h3>
                        <p style="color: #721c24; margin: 0;">Netlify Functions 服务遇到问题，系统正在使用本地备用数据。</p>
                    </div>

                    <h3>当前功能状态：</h3>
                    <ul style="line-height: 1.8;">
                        <li>✅ 查看任务列表（使用备用数据）</li>
                        <li>✅ 项目标签页切换</li>
                        <li>✅ 任务筛选和搜索</li>
                        <li>✅ 生成AI报告</li>
                        <li>❌ 保存新任务到飞书</li>
                        <li>❌ 更新任务状态</li>
                    </ul>

                    <h3>可能的原因：</h3>
                    <ul style="line-height: 1.8;">
                        <li>Netlify Functions 服务正在重启</li>
                        <li>后端代理配置问题</li>
                        <li>飞书API访问限制</li>
                        <li>网络连接问题</li>
                    </ul>

                    <h3>建议操作：</h3>
                    <ol style="line-height: 1.8;">
                        <li><strong>等待几分钟</strong>：服务通常会自动恢复</li>
                        <li><strong>刷新页面</strong>：重新检查连接状态</li>
                        <li><strong>检查网络</strong>：确认网络连接正常</li>
                        <li><strong>联系管理员</strong>：如果问题持续存在</li>
                    </ol>

                    <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                        <h4 style="color: #0c5460; margin-bottom: 0.5rem;">💡 温馨提示</h4>
                        <p style="color: #0c5460; margin: 0;">您仍然可以使用系统查看任务、切换项目和生成报告。数据保存功能会在服务恢复后自动可用。</p>
                    </div>

                    <details style="margin-top: 1rem;">
                        <summary style="cursor: pointer; font-weight: 600;">查看详细错误信息</summary>
                        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.875rem; overflow-x: auto;">${message}</pre>
                    </details>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        <i class="fas fa-sync-alt"></i>
                        刷新页面
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        我知道了
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(helpModal);
    }

    // 同步数据
    async syncData() {
        console.log('同步数据...');
        await this.checkConnectionStatus();
        await this.loadData();
    }

    // 更新项目列表
    updateProjectsList() {
        const projects = [...new Set(this.tasks.map(task => task.project).filter(p => p))];
        this.projects = projects;
        
        // 更新项目筛选下拉框
        const projectFilter = document.getElementById('projectFilter');

        if (projectFilter) {
            // 保存当前选中值
            const currentValue = projectFilter.value;

            // 清空并重新填充
            projectFilter.innerHTML = '<option value="">所有项目</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                option.textContent = project;
                projectFilter.appendChild(option);
            });

            // 恢复选中值
            projectFilter.value = currentValue;
        }
    }

    // 更新筛选条件
    updateFilters() {
        // 状态筛选
        const statusCheckboxes = document.querySelectorAll('.sidebar input[type="checkbox"]');
        this.filters.status = [];
        this.filters.priority = [];
        
        statusCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                if (['true', 'false'].includes(checkbox.value)) {
                    this.filters.status.push(checkbox.value);
                } else {
                    this.filters.priority.push(checkbox.value);
                }
            }
        });
        
        this.renderTasks();
    }

    // 筛选任务
    filterTasks() {
        return this.tasks.filter(task => {
            // 项目筛选
            if (this.filters.project && task.project !== this.filters.project) {
                return false;
            }
            
            // 状态筛选
            const isCompleted = task.completed.toString();
            if (!this.filters.status.includes(isCompleted)) {
                return false;
            }
            
            // 紧急程度筛选
            const priority = this.getTaskPriority(task);
            if (!this.filters.priority.includes(priority)) {
                return false;
            }
            
            // 搜索筛选
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                return task.title.toLowerCase().includes(searchTerm) ||
                       task.project.toLowerCase().includes(searchTerm) ||
                       (task.assignee && task.assignee.toLowerCase().includes(searchTerm));
            }
            
            return true;
        });
    }

    // 获取任务优先级
    getTaskPriority(task) {
        if (!task.dueDate) return 'normal';
        
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 3) return 'urgent';
        return 'normal';
    }

    // 获取优先级显示文本和样式
    getPriorityDisplay(priority) {
        const displays = {
            'urgent': { text: '紧急', class: 'priority-urgent' },
            'normal': { text: '正常', class: 'priority-normal' },
            'overdue': { text: '逾期', class: 'priority-overdue' }
        };
        return displays[priority] || displays.normal;
    }

    // 切换视图
    switchView(view) {
        this.currentView = view;

        // 更新按钮状态
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // 显示/隐藏视图
        document.getElementById('listView').style.display = view === 'list' ? 'block' : 'none';
        document.getElementById('tabsView').style.display = view === 'tabs' ? 'block' : 'none';

        // 渲染对应视图
        if (view === 'list') {
            this.renderListView();
        } else if (view === 'tabs') {
            this.renderTabsView();
        }
    }

    // 渲染任务
    renderTasks() {
        if (this.currentView === 'list') {
            this.renderListView();
        } else if (this.currentView === 'tabs') {
            this.renderTabsView();
        }
    }

    // 渲染列表视图
    renderListView() {
        const filteredTasks = this.filterTasks();
        const taskList = document.getElementById('taskList');
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks" style="font-size: 3rem; color: #cbd5e0; margin-bottom: 1rem;"></i>
                    <p>暂无任务数据</p>
                </div>
            `;
            return;
        }
        
        taskList.innerHTML = filteredTasks.map(task => {
            const priority = this.getTaskPriority(task);
            const priorityDisplay = this.getPriorityDisplay(priority);
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未设定';
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                    <div class="task-item-header">
                        <div class="task-checkbox-container">
                            <input type="checkbox" class="task-checkbox"
                                   ${task.completed ? 'checked' : ''}
                                   data-task-id="${task.id}"
                                   onclick="event.stopPropagation()">
                            <div class="task-info">
                                <div class="task-title">${task.title}</div>
                                <div class="task-project">${task.project}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="priority-badge ${priorityDisplay.class}">
                                ${priorityDisplay.text}
                            </span>
                        </div>
                    </div>
                    <div class="task-meta">
                        <div class="task-assignee">
                            <i class="fas fa-user"></i>
                            ${task.assignee || '未指定'}
                        </div>
                        <div class="task-due-date">
                            <i class="fas fa-calendar"></i>
                            ${dueDate}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 绑定点击事件
        taskList.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    this.editTask(task);
                }
            });
        });

        // 绑定复选框事件
        taskList.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const taskId = e.target.dataset.taskId;
                const completed = e.target.checked;

                console.log('任务状态变更:', taskId, completed ? '完成' : '未完成');

                // 更新任务状态
                await this.toggleTaskCompletion(taskId, completed);
            });
        });
    }

    // 渲染项目标签页视图
    renderTabsView() {
        const filteredTasks = this.filterTasks();

        // 按项目分组
        const tasksByProject = {};
        filteredTasks.forEach(task => {
            const project = task.project || '未分类';
            if (!tasksByProject[project]) {
                tasksByProject[project] = [];
            }
            tasksByProject[project].push(task);
        });

        const projects = Object.keys(tasksByProject);

        // 如果没有当前项目或当前项目不存在，选择第一个项目
        if (!this.currentProject || !projects.includes(this.currentProject)) {
            this.currentProject = projects[0] || '';
        }

        // 渲染项目标签页
        this.renderProjectTabs(projects);

        // 渲染当前项目的内容
        if (this.currentProject && tasksByProject[this.currentProject]) {
            this.renderProjectContent(this.currentProject, tasksByProject[this.currentProject]);
        }
    }

    // 渲染项目标签页导航
    renderProjectTabs(projects) {
        const projectTabs = document.getElementById('projectTabs');

        if (projects.length === 0) {
            projectTabs.innerHTML = '<div class="no-projects">暂无项目数据</div>';
            return;
        }

        projectTabs.innerHTML = projects.map(project => {
            const isActive = project === this.currentProject;
            const projectTasks = this.tasks.filter(task => (task.project || '未分类') === project);
            const completedCount = projectTasks.filter(t => t.completed).length;
            const totalCount = projectTasks.length;
            const urgentCount = projectTasks.filter(task =>
                !task.completed && this.getTaskPriority(task) === 'urgent'
            ).length;

            return `
                <div class="project-tab ${isActive ? 'active' : ''}" data-project="${project}">
                    <div class="tab-header">
                        <i class="fas fa-folder${isActive ? '-open' : ''}"></i>
                        <span class="tab-title">${project}</span>
                        ${urgentCount > 0 ? `<span class="urgent-badge">${urgentCount}</span>` : ''}
                    </div>
                    <div class="tab-stats">
                        <span class="tab-progress">${completedCount}/${totalCount}</span>
                        <div class="tab-progress-bar">
                            <div class="tab-progress-fill" style="width: ${totalCount > 0 ? (completedCount / totalCount * 100) : 0}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 绑定标签页点击事件
        projectTabs.querySelectorAll('.project-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const project = tab.dataset.project;
                this.switchToProject(project);
            });
        });
    }

    // 渲染项目内容
    renderProjectContent(project, tasks) {
        const projectHeader = document.getElementById('projectHeader');
        const projectTasksList = document.getElementById('projectTasksList');

        // 统计信息
        const completedCount = tasks.filter(t => t.completed).length;
        const totalCount = tasks.length;
        const completionRate = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
        const urgentTasks = tasks.filter(task => !task.completed && this.getTaskPriority(task) === 'urgent');
        const overdueTasks = tasks.filter(task => !task.completed && this.getTaskPriority(task) === 'overdue');

        // 渲染项目头部
        projectHeader.innerHTML = `
            <div class="project-info">
                <h2 class="project-name">
                    <i class="fas fa-folder-open"></i>
                    ${project}
                </h2>
                <div class="project-summary">
                    <div class="summary-stats">
                        <div class="stat-card">
                            <div class="stat-number">${totalCount}</div>
                            <div class="stat-label">总任务</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${completedCount}</div>
                            <div class="stat-label">已完成</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${completionRate}%</div>
                            <div class="stat-label">完成率</div>
                        </div>
                        ${urgentTasks.length > 0 ? `
                        <div class="stat-card urgent">
                            <div class="stat-number">${urgentTasks.length}</div>
                            <div class="stat-label">紧急</div>
                        </div>
                        ` : ''}
                        ${overdueTasks.length > 0 ? `
                        <div class="stat-card overdue">
                            <div class="stat-number">${overdueTasks.length}</div>
                            <div class="stat-label">逾期</div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="project-progress-large">
                        <div class="progress-bar-large">
                            <div class="progress-fill-large" style="width: ${completionRate}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="taskManager.addTaskToProject('${project}')">
                    <i class="fas fa-plus"></i>
                    新增任务
                </button>
            </div>
        `;

        // 渲染任务列表
        if (tasks.length === 0) {
            projectTasksList.innerHTML = `
                <div class="empty-project">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>暂无任务</h3>
                    <p>点击"新增任务"开始添加任务</p>
                </div>
            `;
        } else {
            // 按状态分组显示任务
            const pendingTasks = tasks.filter(t => !t.completed);
            const completedTasks = tasks.filter(t => t.completed);

            projectTasksList.innerHTML = `
                ${pendingTasks.length > 0 ? `
                <div class="task-group">
                    <h3 class="group-title">
                        <i class="fas fa-clock"></i>
                        进行中的任务 (${pendingTasks.length})
                    </h3>
                    <div class="task-group-list">
                        ${pendingTasks.map(task => this.renderProjectTask(task)).join('')}
                    </div>
                </div>
                ` : ''}

                ${completedTasks.length > 0 ? `
                <div class="task-group">
                    <h3 class="group-title">
                        <i class="fas fa-check-circle"></i>
                        已完成的任务 (${completedTasks.length})
                    </h3>
                    <div class="task-group-list">
                        ${completedTasks.map(task => this.renderProjectTask(task)).join('')}
                    </div>
                </div>
                ` : ''}
            `;

            // 绑定任务点击事件
            projectTasksList.querySelectorAll('.project-task').forEach(item => {
                item.addEventListener('click', () => {
                    const taskId = item.dataset.taskId;
                    const task = this.tasks.find(t => t.id === taskId);
                    if (task) {
                        this.editTask(task);
                    }
                });
            });

            // 绑定项目任务复选框事件
            projectTasksList.querySelectorAll('.project-task-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const taskId = e.target.dataset.taskId;
                    const completed = e.target.checked;

                    console.log('项目任务状态变更:', taskId, completed ? '完成' : '未完成');

                    // 更新任务状态
                    await this.toggleTaskCompletion(taskId, completed);
                });
            });
        }
    }

    // 渲染单个项目任务
    renderProjectTask(task) {
        const priority = this.getTaskPriority(task);
        const priorityDisplay = this.getPriorityDisplay(priority);
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未设定';

        return `
            <div class="project-task ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-main">
                    <div class="task-checkbox-container">
                        <input type="checkbox" class="task-checkbox project-task-checkbox"
                               ${task.completed ? 'checked' : ''}
                               data-task-id="${task.id}"
                               onclick="event.stopPropagation()">
                    </div>
                    <div class="task-content">
                        <div class="task-title">${task.title}</div>
                        <div class="task-details">
                            <span class="task-assignee">
                                <i class="fas fa-user"></i>
                                ${task.assignee || '未指定'}
                            </span>
                            <span class="task-due">
                                <i class="fas fa-calendar"></i>
                                ${dueDate}
                            </span>
                            <span class="priority-badge ${priorityDisplay.class}">
                                ${priorityDisplay.text}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 切换到指定项目
    switchToProject(project) {
        this.currentProject = project;
        this.renderTabsView();
    }

    // 切换任务完成状态
    async toggleTaskCompletion(taskId, completed) {
        try {
            // 显示加载状态
            this.showLoading(true);

            // 找到任务
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                throw new Error('任务不存在');
            }

            console.log('更新任务完成状态:', taskId, completed);

            // 准备更新数据
            const updateData = {
                title: task.title,
                project: task.project,
                assignee: task.assignee,
                dueDate: task.dueDate,
                completed: completed
            };

            // 根据完成状态设置完成时间
            if (completed) {
                // 标记为完成：记录当前时间戳
                const now = new Date();
                const timestamp = now.getTime();

                updateData.completedTime = timestamp; // 发送时间戳给后端

                console.log('✅ 任务标记为完成，记录时间戳:', timestamp);
                console.log('🕐 对应时间:', now.toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }));
            } else {
                // 取消完成：清空完成时间
                updateData.completedTime = '';
                console.log('❌ 任务取消完成，清空完成时间');
            }

            // 调用API更新任务状态
            const result = await window.feishuTaskAPI.updateTask(taskId, updateData);

            if (result.success) {
                console.log('✅ 任务状态更新成功');

                // 重新加载数据，确保与飞书数据一致
                await this.loadData();

                // 显示成功提示
                this.showSuccessMessage(completed ? '任务已标记为完成' : '任务已标记为未完成');
            } else {
                throw new Error(result.error || '更新任务状态失败');
            }

        } catch (error) {
            console.error('❌ 更新任务状态失败:', error);

            // 恢复复选框状态
            const checkbox = document.querySelector(`[data-task-id="${taskId}"].task-checkbox`);
            if (checkbox) {
                checkbox.checked = !completed;
            }

            this.showError('更新任务状态失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // 显示成功消息
    showSuccessMessage(message) {
        const successBar = document.createElement('div');
        successBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #48bb78;
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 1000;
            font-size: 0.875rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        successBar.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${message}
        `;

        document.body.insertBefore(successBar, document.body.firstChild);

        // 3秒后自动隐藏
        setTimeout(() => {
            if (successBar.parentElement) {
                successBar.remove();
            }
        }, 3000);
    }

    // 为特定项目添加任务
    addTaskToProject(project) {
        this.showTaskModal();

        // 预填项目名称
        const projectSelect = document.getElementById('taskProjectSelect');
        const projectInput = document.getElementById('taskProject');
        const container = document.querySelector('.project-input-container');

        // 检查项目是否在选项中
        const projectOption = Array.from(projectSelect.options).find(option => option.value === project);
        if (projectOption) {
            // 项目存在，使用选择模式
            projectSelect.value = project;
            projectInput.value = project;
            container.classList.remove('input-mode');
            container.classList.add('select-mode');
        } else {
            // 项目不存在，使用输入模式
            projectSelect.value = '';
            projectInput.value = project;
            container.classList.remove('select-mode');
            container.classList.add('input-mode');
        }
    }

    // 显示任务模态框
    showTaskModal(task = null) {
        this.currentEditingTask = task;

        // 更新项目选项（确保最新）
        this.updateProjectOptions();

        const projectSelect = document.getElementById('taskProjectSelect');
        const projectInput = document.getElementById('taskProject');
        const container = document.querySelector('.project-input-container');

        if (task) {
            // 编辑模式
            document.getElementById('modalTitle').textContent = '编辑任务';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskAssignee').value = task.assignee || '';
            document.getElementById('taskDueDate').value = task.dueDate || '';

            // 处理项目字段
            if (task.project) {
                // 检查项目是否在选项中
                const projectOption = Array.from(projectSelect.options).find(option => option.value === task.project);
                if (projectOption) {
                    // 项目存在，使用选择模式
                    projectSelect.value = task.project;
                    projectInput.value = task.project;
                    container.classList.remove('input-mode');
                    container.classList.add('select-mode');
                } else {
                    // 项目不存在，使用输入模式
                    projectSelect.value = '';
                    projectInput.value = task.project;
                    container.classList.remove('select-mode');
                    container.classList.add('input-mode');
                }
            } else {
                // 没有项目，默认选择模式
                projectSelect.value = '';
                projectInput.value = '';
                container.classList.remove('input-mode');
                container.classList.add('select-mode');
            }
        } else {
            // 新增模式
            document.getElementById('modalTitle').textContent = '新增任务';
            document.getElementById('taskForm').reset();

            // 重置项目选择控件到选择模式
            projectSelect.value = '';
            projectInput.value = '';
            container.classList.remove('input-mode');
            container.classList.add('select-mode');
        }

        document.getElementById('taskModal').classList.add('show');
    }

    // 隐藏任务模态框
    hideTaskModal() {
        document.getElementById('taskModal').classList.remove('show');
        this.currentEditingTask = null;
    }

    // 编辑任务
    editTask(task) {
        this.showTaskModal(task);
    }

    // 保存任务
    async saveTask() {
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            project: document.getElementById('taskProject').value.trim(),
            assignee: document.getElementById('taskAssignee').value.trim(),
            dueDate: document.getElementById('taskDueDate').value,
            completed: this.currentEditingTask ? this.currentEditingTask.completed : false
        };
        
        // 验证必填字段
        if (!taskData.title || !taskData.project) {
            alert('请填写任务事项和所属项目');
            return;
        }
        
        this.showLoading(true);
        
        try {
            let result;
            
            if (this.currentEditingTask) {
                // 更新任务
                result = await window.feishuTaskAPI.updateTask(this.currentEditingTask.id, taskData);
            } else {
                // 创建任务
                result = await window.feishuTaskAPI.createTask(taskData);
            }
            
            if (result.success) {
                console.log('✅ 任务保存成功');
                this.hideTaskModal();
                await this.loadData(); // 重新加载数据
            } else {
                console.error('❌ 任务保存失败:', result.error);
                this.showError('保存失败: ' + result.error);
                // 不关闭模态框，让用户可以重试或修改
            }
        } catch (error) {
            console.error('❌ 任务保存异常:', error);
            this.showError('保存异常: ' + error.message);
            // 不关闭模态框，让用户可以重试
        } finally {
            this.showLoading(false);
        }
    }











    // 显示/隐藏加载状态
    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    // 显示错误信息
    showError(message) {
        // 如果是后端服务不可用，显示特殊的帮助信息
        if (message.includes('500') || message.includes('Internal Server Error') || message.includes('后端服务不可用')) {
            this.showServerError(message);
        } else {
            // 其他错误使用简单提示
            this.showSimpleError(message);
        }
    }

    // 显示简单错误提示
    showSimpleError(message) {
        // 创建简单的错误提示条
        const errorBar = document.createElement('div');
        errorBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f56565;
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 1000;
            font-size: 0.875rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        errorBar.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem;">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.insertBefore(errorBar, document.body.firstChild);

        // 5秒后自动隐藏
        setTimeout(() => {
            if (errorBar.parentElement) {
                errorBar.remove();
            }
        }, 5000);
    }

    // 生成日报
    async generateDailyReport() {
        try {
            console.log('📅 开始生成日报...');

            // 显示报告模态框（不显示遮罩）
            this.showReportModal('📅 今日工作日报');

            // 显示进度过程
            await this.showGenerationProgress('daily');

            // 调用豆包API生成日报（使用今天的日期）
            const today = new Date().toISOString().split('T')[0];
            console.log('📅 生成日报的目标日期:', today);

            const result = await window.doubaoAPI.generateDailyReport(this.tasks, today);

            if (result.success) {
                console.log('✅ 日报生成成功');
                this.displayReport(result.content);

                // 保存日报到飞书表格
                await this.saveReportToFeishu({
                    title: `工作日报 - ${today}`,
                    type: '日报',
                    date: today,
                    content: result.content,
                    taskCount: this.tasks.filter(t => t.completed).length
                });
            } else {
                console.error('❌ 日报生成失败:', result.error);
                document.getElementById('reportText').innerHTML = `<div class="error-message">❌ 日报生成失败: ${result.error}</div>`;
            }
        } catch (error) {
            console.error('❌ 日报生成异常:', error);
            document.getElementById('reportText').innerHTML = `<div class="error-message">❌ 日报生成异常: ${error.message}</div>`;
        }
    }

    // 测试特定日期的日报（用于调试）
    async generateDailyReportForDate(targetDate) {
        try {
            console.log('🧪 测试生成日报，目标日期:', targetDate);
            this.showLoading(true);

            this.showReportModal(`📅 ${targetDate} 工作日报`);
            document.getElementById('reportText').innerHTML = '<div class="generating-report"><i class="fas fa-robot"></i> AI正在分析指定日期任务，生成专业日报...</div>';

            const result = await window.doubaoAPI.generateDailyReport(this.tasks, targetDate);

            if (result.success) {
                console.log('✅ 指定日期日报生成成功');
                this.displayReport(result.content);
            } else {
                console.error('❌ 指定日期日报生成失败:', result.error);
                document.getElementById('reportText').innerHTML = `<div class="error-message">❌ 日报生成失败: ${result.error}</div>`;
            }
        } catch (error) {
            console.error('❌ 指定日期日报生成异常:', error);
            document.getElementById('reportText').innerHTML = `<div class="error-message">❌ 日报生成异常: ${error.message}</div>`;
        } finally {
            this.showLoading(false);
        }
    }

    // 生成周报
    async generateWeeklyReport() {
        try {
            console.log('📊 开始生成周报...');

            // 显示报告模态框（不显示遮罩）
            this.showReportModal('📊 本周工作周报');

            // 显示进度过程
            await this.showGenerationProgress('weekly');

            // 调用豆包API生成周报
            const result = await window.doubaoAPI.generateWeeklyReport(this.tasks);

            if (result.success) {
                console.log('✅ 周报生成成功');
                this.displayReport(result.content);

                // 获取本周时间范围用于标题
                const today = new Date();
                const { startOfWeek, endOfWeek } = window.doubaoAPI.getWeekRange(today);

                // 保存周报到飞书表格
                await this.saveReportToFeishu({
                    title: `工作周报 - ${startOfWeek} 至 ${endOfWeek}`,
                    type: '周报',
                    date: `${startOfWeek} 至 ${endOfWeek}`,
                    content: result.content,
                    taskCount: this.tasks.filter(t => t.completed).length
                });
            } else {
                console.error('❌ 周报生成失败:', result.error);
                document.getElementById('reportText').innerHTML = `<div class="error-message">❌ 周报生成失败: ${result.error}</div>`;
            }
        } catch (error) {
            console.error('❌ 周报生成异常:', error);
            document.getElementById('reportText').innerHTML = `<div class="error-message">❌ 周报生成异常: ${error.message}</div>`;
        }
    }

    // 显示报告模态框
    showReportModal(title) {
        document.getElementById('reportTitle').textContent = title;
        document.getElementById('reportModal').classList.add('show');
    }

    // 隐藏报告模态框
    hideReportModal() {
        document.getElementById('reportModal').classList.remove('show');
    }

    // 显示生成进度
    async showGenerationProgress(type) {
        const reportText = document.getElementById('reportText');
        const isDaily = type === 'daily';

        const steps = isDaily ? [
            {
                text: '🔍 正在扫描任务数据库...',
                detail: '从飞书多维表格检索今日所有任务记录',
                tech: '连接飞书API，获取任务数据'
            },
            {
                text: '📅 正在筛选今日完成任务...',
                detail: '基于完成时间戳进行精确的日期范围筛选',
                tech: '时间范围: 今日00:00:00 - 23:59:59'
            },
            {
                text: '📊 正在分析任务完成情况...',
                detail: '统计项目分布、工作量和完成效率指标',
                tech: '计算任务数量、项目分类、时间分布'
            },
            {
                text: '🧠 正在构建AI分析提示词...',
                detail: '为豆包AI准备专业的工作分析指令和上下文',
                tech: '包含任务详情、完成时间、项目信息'
            },
            {
                text: '🤖 正在连接豆包AI服务...',
                detail: '建立与字节跳动豆包大模型的安全连接',
                tech: 'API: ark.cn-beijing.volces.com'
            },
            {
                text: '🎯 AI正在深度分析任务数据...',
                detail: '豆包AI运用专业知识分析工作成果和效率',
                tech: '模型: doubao-seed-1-6-250615'
            },
            {
                text: '✍️ 正在生成专业日报内容...',
                detail: 'AI智能生成工作总结、成果分析和改进建议',
                tech: '输出格式: Markdown专业报告'
            }
        ] : [
            {
                text: '🔍 正在扫描任务数据库...',
                detail: '从飞书多维表格检索本周所有任务记录',
                tech: '连接飞书API，获取完整任务数据集'
            },
            {
                text: '📅 正在计算本周时间范围...',
                detail: '智能计算周一到周日的准确时间边界',
                tech: '周范围: 本周一00:00 - 本周日23:59'
            },
            {
                text: '📊 正在筛选本周完成任务...',
                detail: '基于完成时间戳进行精确的周范围筛选',
                tech: '时间解析: 支持多种时间格式'
            },
            {
                text: '📈 正在分析工作趋势数据...',
                detail: '统计项目进展、效率指标和工作分布模式',
                tech: '计算完成率、项目占比、时间分布'
            },
            {
                text: '🧠 正在构建AI分析提示词...',
                detail: '为豆包AI准备专业的周度工作分析指令',
                tech: '包含趋势分析、对比数据、规划建议'
            },
            {
                text: '🤖 正在连接豆包AI服务...',
                detail: '建立与字节跳动豆包大模型的安全连接',
                tech: 'API: ark.cn-beijing.volces.com'
            },
            {
                text: '🎯 AI正在深度分析周度数据...',
                detail: '豆包AI运用专业知识分析工作趋势和效率',
                tech: '模型: doubao-seed-1-6-250615'
            },
            {
                text: '✍️ 正在生成专业周报内容...',
                detail: 'AI智能生成工作总结、趋势分析和下周规划',
                tech: '输出格式: Markdown专业周报'
            }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const progress = ((i + 1) / steps.length) * 100;

            reportText.innerHTML = `<div class="generating-report">
                <div class="robot-icon">🤖</div>
                <div class="progress-header">
                    <div class="progress-text">${step.text}</div>
                    <div class="progress-step-info">步骤 ${i + 1}/${steps.length}</div>
                </div>
                <div class="progress-detail">${step.detail}</div>
                <div class="progress-tech">${step.tech}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-info">
                    <span class="progress-percent">${Math.round(progress)}%</span>
                    <span class="progress-status">${i === steps.length - 1 ? '即将完成' : '处理中...'}</span>
                </div>
                <div class="progress-time">预计剩余时间: ${Math.max(1, steps.length - i - 1)} 秒</div>
            </div>`;

            // 每步等待一段时间，最后一步稍长
            const delay = i === steps.length - 1 ? 2000 : 1200;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // 显示报告内容
    displayReport(content) {
        const reportText = document.getElementById('reportText');
        reportText.innerHTML = '';

        // 创建打字机效果
        let index = 0;
        const speed = 20; // 打字速度

        function typeWriter() {
            if (index < content.length) {
                reportText.textContent += content.charAt(index);
                index++;
                setTimeout(typeWriter, speed);
            }
        }

        typeWriter();
    }

    // 测试周报筛选逻辑（调试用）
    testWeeklyFilter() {
        console.log('🧪 测试周报筛选逻辑...');

        const today = new Date();
        const { startOfWeek, endOfWeek } = window.doubaoAPI.getWeekRange(today);

        console.log('📅 当前日期:', today.toLocaleDateString());
        console.log('📊 本周范围:', startOfWeek, '到', endOfWeek);

        const weeklyTasks = window.doubaoAPI.filterTasksByWeek(this.tasks, startOfWeek, endOfWeek);
        console.log('✅ 筛选结果:', weeklyTasks.length, '个任务');

        weeklyTasks.forEach(task => {
            console.log(`  - ${task.title} (完成时间: ${task.completedTime || task.完成时间})`);
        });
    }

    // 保存报告到飞书表格
    async saveReportToFeishu(reportData) {
        try {
            console.log('📝 保存报告到飞书表格...');

            const result = await window.feishuTaskAPI.saveReport(reportData);

            if (result.success) {
                console.log('✅ 报告保存成功');
                // 显示保存成功提示
                this.showNotification('📝 报告已保存到飞书表格', 'success');
            } else {
                console.error('❌ 报告保存失败:', result.error);
                this.showNotification('❌ 报告保存失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('❌ 保存报告异常:', error);
            this.showNotification('❌ 保存报告异常: ' + error.message, 'error');
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => notification.classList.add('show'), 100);

        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // 复制报告
    copyReport() {
        const reportText = document.getElementById('reportText').textContent;
        navigator.clipboard.writeText(reportText).then(() => {
            // 显示复制成功提示
            const btn = document.getElementById('copyReportBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> 已复制';
            btn.style.background = '#48bb78';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动选择文本复制');
        });
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM加载完成，开始初始化TaskManager...');
    try {
        window.taskManager = new TaskManager();
        console.log('✅ TaskManager初始化成功');
    } catch (error) {
        console.error('❌ TaskManager初始化失败:', error);
    }
});
