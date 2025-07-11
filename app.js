// 主应用逻辑
class TaskManager {
    constructor() {
        this.tasks = [];
        this.projects = [];
        this.currentView = 'list';
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

    // 加载数据
    async loadData() {
        this.showLoading(true);
        
        try {
            // 从飞书获取任务数据
            const result = await window.feishuTaskAPI.getTasks();
            
            if (result.success) {
                this.tasks = result.tasks;
                console.log('✅ 任务数据加载成功，共', this.tasks.length, '条');
                
                // 提取项目列表
                this.updateProjectsList();
                
                // 渲染界面
                this.renderTasks();
            } else {
                console.error('❌ 加载任务数据失败:', result.error);
                this.showError('加载数据失败: ' + result.error);
            }
        } catch (error) {
            console.error('❌ 加载数据异常:', error);
            this.showError('加载数据异常: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // 同步数据
    async syncData() {
        console.log('同步数据...');
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
        document.getElementById('kanbanView').style.display = view === 'kanban' ? 'block' : 'none';
        
        // 渲染对应视图
        if (view === 'list') {
            this.renderListView();
        } else {
            this.renderKanbanView();
        }
    }

    // 渲染任务
    renderTasks() {
        if (this.currentView === 'list') {
            this.renderListView();
        } else {
            this.renderKanbanView();
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

    // 渲染看板视图
    renderKanbanView() {
        const filteredTasks = this.filterTasks();
        const kanbanBoard = document.getElementById('kanbanBoard');
        
        // 按项目分组
        const tasksByProject = {};
        filteredTasks.forEach(task => {
            const project = task.project || '未分类';
            if (!tasksByProject[project]) {
                tasksByProject[project] = [];
            }
            tasksByProject[project].push(task);
        });
        
        kanbanBoard.innerHTML = Object.entries(tasksByProject).map(([project, tasks]) => {
            const completedCount = tasks.filter(t => t.completed).length;
            const totalCount = tasks.length;
            const completionRate = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
            
            return `
                <div class="kanban-column">
                    <h3 class="column-header">
                        ${project}
                        <small>(${completedCount}/${totalCount} - ${completionRate}%)</small>
                    </h3>
                    <div class="kanban-tasks">
                        ${tasks.map(task => {
                            const priority = this.getTaskPriority(task);
                            const priorityDisplay = this.getPriorityDisplay(priority);
                            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未设定';
                            
                            return `
                                <div class="kanban-task" data-task-id="${task.id}">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                        <div class="task-title" style="font-size: 0.875rem; font-weight: 600;">${task.title}</div>
                                        <span class="status-badge ${task.completed ? 'status-completed' : 'status-pending'}" style="font-size: 0.625rem;">
                                            ${task.completed ? '✓' : '○'}
                                        </span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #718096;">
                                        <span>${task.assignee || '未指定'}</span>
                                        <span class="priority-badge ${priorityDisplay.class}" style="font-size: 0.625rem;">
                                            ${priorityDisplay.text}
                                        </span>
                                    </div>
                                    <div style="font-size: 0.75rem; color: #718096; margin-top: 0.25rem;">
                                        <i class="fas fa-calendar"></i> ${dueDate}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        // 绑定点击事件
        kanbanBoard.querySelectorAll('.kanban-task').forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    this.editTask(task);
                }
            });
        });
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
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);
        
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
                alert('保存失败: ' + result.error);
            }
        } catch (error) {
            console.error('❌ 任务保存异常:', error);
            alert('保存异常: ' + error.message);
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
        alert(message); // 简单的错误提示，可以后续改进为更好的UI
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});
