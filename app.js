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
        console.log('初始化任务管理系统...');
        
        // 绑定事件监听器
        this.bindEventListeners();
        
        // 设置默认日期
        this.setDefaultDates();

        // 检查连接状态
        await this.checkConnectionStatus();

        // 加载数据
        await this.loadData();
        
        console.log('✅ 任务管理系统初始化完成');
    }

    // 绑定事件监听器
    bindEventListeners() {
        // 同步数据按钮
        document.getElementById('syncBtn').addEventListener('click', () => this.syncData());
        
        // 生成报告按钮
        document.getElementById('reportBtn').addEventListener('click', () => this.showReportModal());
        
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
        
        // 报告相关
        document.getElementById('closeReportModal').addEventListener('click', () => this.hideReportModal());
        document.getElementById('cancelReportBtn').addEventListener('click', () => this.hideReportModal());
        document.getElementById('generateReportBtn').addEventListener('click', () => this.generateReport());
        document.getElementById('copyReportBtn').addEventListener('click', () => this.copyReport());
        
        // 模态框外部点击关闭
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.hideTaskModal();
        });
        document.getElementById('reportModal').addEventListener('click', (e) => {
            if (e.target.id === 'reportModal') this.hideReportModal();
        });
    }

    // 设置默认日期
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reportDate').value = today;
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
                    <h2>🔧 服务器连接问题</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: #721c24; margin-bottom: 0.5rem;">后端服务暂时不可用</h3>
                        <p style="color: #721c24; margin: 0;">Netlify Functions 服务遇到问题，系统将使用本地备用数据。</p>
                    </div>

                    <h3>当前状态：</h3>
                    <ul style="line-height: 1.8;">
                        <li>✅ 可以查看任务（使用备用数据）</li>
                        <li>❌ 无法保存新任务到飞书</li>
                        <li>❌ 无法更新任务状态</li>
                        <li>✅ 可以生成AI报告</li>
                    </ul>

                    <h3>解决方案：</h3>
                    <ol style="line-height: 1.8;">
                        <li><strong>激活CORS代理</strong>（推荐）：<br>
                            <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank"
                               style="color: #667eea; text-decoration: none; font-weight: 600;">
                               点击这里激活CORS代理服务
                            </a>
                        </li>
                        <li><strong>等待服务恢复</strong>：后端服务可能正在重启</li>
                        <li><strong>联系管理员</strong>：如果问题持续存在</li>
                    </ol>

                    <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                        <h4 style="color: #0c5460; margin-bottom: 0.5rem;">💡 临时解决方案</h4>
                        <p style="color: #0c5460; margin: 0;">激活CORS代理后，系统会自动切换到直连模式，可以正常保存和更新任务。</p>
                    </div>

                    <details style="margin-top: 1rem;">
                        <summary style="cursor: pointer; font-weight: 600;">查看详细错误信息</summary>
                        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.875rem; overflow-x: auto;">${message}</pre>
                    </details>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank')">
                        <i class="fas fa-external-link-alt"></i>
                        激活CORS代理
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
        const reportProject = document.getElementById('reportProject');
        
        [projectFilter, reportProject].forEach(select => {
            // 保存当前选中值
            const currentValue = select.value;
            
            // 清空并重新填充
            select.innerHTML = '<option value="">所有项目</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                option.textContent = project;
                select.appendChild(option);
            });
            
            // 恢复选中值
            select.value = currentValue;
        });
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
                <div class="task-item" data-task-id="${task.id}">
                    <div class="task-item-header">
                        <div>
                            <div class="task-title">${task.title}</div>
                            <div class="task-project">${task.project}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="status-badge ${task.completed ? 'status-completed' : 'status-pending'}">
                                ${task.completed ? '已完成' : '未完成'}
                            </span>
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
                    <div class="task-checkbox">
                        <i class="fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
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

    // 为特定项目添加任务
    addTaskToProject(project) {
        this.showTaskModal();
        // 预填项目名称
        document.getElementById('taskProject').value = project;
    }

    // 显示任务模态框
    showTaskModal(task = null) {
        this.currentEditingTask = task;
        
        if (task) {
            // 编辑模式
            document.getElementById('modalTitle').textContent = '编辑任务';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskProject').value = task.project;
            document.getElementById('taskAssignee').value = task.assignee || '';
            document.getElementById('taskDueDate').value = task.dueDate || '';
            document.getElementById('taskCompleted').checked = task.completed;
        } else {
            // 新增模式
            document.getElementById('modalTitle').textContent = '新增任务';
            document.getElementById('taskForm').reset();
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
            completed: document.getElementById('taskCompleted').checked
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

    // 显示报告模态框
    showReportModal() {
        document.getElementById('reportModal').classList.add('show');
        document.getElementById('reportContent').style.display = 'none';
        document.getElementById('copyReportBtn').style.display = 'none';
    }

    // 隐藏报告模态框
    hideReportModal() {
        document.getElementById('reportModal').classList.remove('show');
    }

    // 生成报告
    async generateReport() {
        const reportType = document.querySelector('input[name="reportType"]:checked').value;
        const reportDate = document.getElementById('reportDate').value;
        const reportProject = document.getElementById('reportProject').value;
        
        if (!reportDate) {
            alert('请选择报告日期');
            return;
        }
        
        this.showLoading(true);
        
        try {
            let result;
            
            if (reportType === 'daily') {
                result = await window.doubaoAPI.generateDailyReport(this.tasks, reportDate, reportProject);
            } else {
                result = await window.doubaoAPI.generateWeeklyReport(this.tasks, reportDate, reportProject);
            }
            
            if (result.success) {
                console.log('✅ 报告生成成功');
                document.getElementById('reportText').textContent = result.report;
                document.getElementById('reportContent').style.display = 'block';
                document.getElementById('copyReportBtn').style.display = 'inline-flex';
            } else {
                console.error('❌ 报告生成失败:', result.error);
                alert('生成报告失败: ' + result.error);
            }
        } catch (error) {
            console.error('❌ 报告生成异常:', error);
            alert('生成报告异常: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // 复制报告
    copyReport() {
        const reportText = document.getElementById('reportText').textContent;
        navigator.clipboard.writeText(reportText).then(() => {
            alert('报告已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动选择文本复制');
        });
    }

    // 显示/隐藏加载状态
    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    // 显示错误信息
    showError(message) {
        // 如果是CORS相关错误，显示特殊的帮助信息
        if (message.includes('CORS') || message.includes('cors-anywhere') || message.includes('403') || message.includes('Forbidden')) {
            this.showCorsHelp(message);
        } else if (message.includes('500') || message.includes('Internal Server Error')) {
            this.showServerError(message);
        } else {
            alert(message);
        }
    }

    // 显示CORS帮助信息
    showCorsHelp(message) {
        const helpModal = document.createElement('div');
        helpModal.className = 'modal show';
        helpModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🔧 需要激活CORS代理服务</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: #856404; margin-bottom: 0.5rem;">为什么会出现这个问题？</h3>
                        <p style="color: #856404; margin: 0;">由于浏览器的安全策略，网页无法直接访问飞书API。我们使用CORS代理服务来解决这个问题，但该服务需要临时激活。</p>
                    </div>

                    <h3>请按以下步骤操作：</h3>
                    <ol style="line-height: 1.8;">
                        <li><strong>点击下面的链接</strong>（会在新窗口打开）：<br>
                            <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank"
                               style="color: #667eea; text-decoration: none; font-weight: 600;">
                               https://cors-anywhere.herokuapp.com/corsdemo
                            </a>
                        </li>
                        <li><strong>点击页面上的按钮</strong>："Request temporary access to the demo server"</li>
                        <li><strong>等待几秒钟</strong>，然后回到本页面</li>
                        <li><strong>点击"同步数据"按钮</strong>重新尝试</li>
                    </ol>

                    <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                        <h4 style="color: #0c5460; margin-bottom: 0.5rem;">💡 小贴士</h4>
                        <p style="color: #0c5460; margin: 0;">这个激活只需要做一次，之后就可以正常使用了。如果过一段时间又出现同样问题，重复上述步骤即可。</p>
                    </div>

                    <details style="margin-top: 1rem;">
                        <summary style="cursor: pointer; font-weight: 600;">查看详细错误信息</summary>
                        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.875rem; overflow-x: auto;">${message}</pre>
                    </details>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank')">
                        <i class="fas fa-external-link-alt"></i>
                        打开激活页面
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        我知道了
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(helpModal);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});
