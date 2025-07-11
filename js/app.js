// 主应用逻辑
class TaskManager {
    constructor() {
        this.feishuAPI = new FeishuAPI();
        this.doubaoAPI = new DoubaoAPI();
        this.tasks = [];
        this.projects = new Set();
        this.currentProject = null;
        this.fields = {};
        
        this.init();
    }

    async init() {
        try {
            await this.loadFields();
            await this.loadTasks();
            this.renderProjects();
            this.renderTasks();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('系统初始化失败，请检查网络连接和配置');
        }
    }

    async loadFields() {
        try {
            const fieldsData = await this.feishuAPI.getTableFields();
            this.fields = {};
            
            fieldsData.items.forEach(field => {
                this.fields[field.field_name] = field;
            });
        } catch (error) {
            console.error('加载字段信息失败:', error);
            throw error;
        }
    }

    async loadTasks() {
        try {
            const data = await this.feishuAPI.getRecords();
            this.tasks = data.items || [];
            
            // 提取项目列表
            this.projects.clear();
            this.tasks.forEach(task => {
                const project = task.fields[FIELD_MAPPING.PROJECT];
                if (project) {
                    this.projects.add(project);
                }
            });
            
            // 如果没有选中项目，选择第一个
            if (!this.currentProject && this.projects.size > 0) {
                this.currentProject = Array.from(this.projects)[0];
            }
        } catch (error) {
            console.error('加载任务失败:', error);
            throw error;
        }
    }

    renderProjects() {
        const tabsContainer = document.getElementById('projectTabs');
        tabsContainer.innerHTML = '';

        // 添加"全部"选项
        const allTab = document.createElement('div');
        allTab.className = `tab ${this.currentProject === null ? 'active' : ''}`;
        allTab.textContent = '全部项目';
        allTab.onclick = () => this.selectProject(null);
        tabsContainer.appendChild(allTab);

        // 添加各个项目标签
        this.projects.forEach(project => {
            const tab = document.createElement('div');
            tab.className = `tab ${this.currentProject === project ? 'active' : ''}`;
            tab.textContent = project;
            tab.onclick = () => this.selectProject(project);
            tabsContainer.appendChild(tab);
        });
    }

    selectProject(project) {
        this.currentProject = project;
        this.renderProjects();
        this.renderTasks();
    }

    renderTasks() {
        const tasksContainer = document.getElementById('tasksList');
        const filteredTasks = this.currentProject 
            ? this.tasks.filter(task => task.fields[FIELD_MAPPING.PROJECT] === this.currentProject)
            : this.tasks;

        // 更新统计信息
        this.updateStats(filteredTasks);

        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = '<div class="loading">暂无任务</div>';
            return;
        }

        tasksContainer.innerHTML = '';
        
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            tasksContainer.appendChild(taskElement);
        });
    }

    updateStats(tasks) {
        const statsBar = document.getElementById('statsBar');
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.fields[FIELD_MAPPING.STATUS] === '已完成').length;
        const inProgressTasks = tasks.filter(task => task.fields[FIELD_MAPPING.STATUS] === '进行中').length;
        const pendingTasks = tasks.filter(task => task.fields[FIELD_MAPPING.STATUS] === '待开始').length;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('inProgressTasks').textContent = inProgressTasks;
        document.getElementById('pendingTasks').textContent = pendingTasks;

        if (totalTasks > 0) {
            statsBar.style.display = 'flex';
        }
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        let taskClass = 'task-item';
        
        const taskName = task.fields[FIELD_MAPPING.TASK_NAME] || '未命名任务';
        const status = task.fields[FIELD_MAPPING.STATUS] || '未知状态';
        const priority = task.fields[FIELD_MAPPING.PRIORITY] || '未知优先级';
        const assignee = task.fields[FIELD_MAPPING.ASSIGNEE] || '未分配';
        const dueDate = task.fields[FIELD_MAPPING.DUE_DATE] || '';
        const description = task.fields[FIELD_MAPPING.DESCRIPTION] || '';

        // 根据优先级添加样式
        if (priority === '高' || priority === '紧急') {
            taskClass += ' priority-high';
        } else if (priority === '中') {
            taskClass += ' priority-medium';
        } else {
            taskClass += ' priority-low';
        }

        taskDiv.className = taskClass;

        // 状态标签样式
        let statusClass = 'task-status';
        switch(status) {
            case '待开始':
                statusClass += ' status-pending';
                break;
            case '进行中':
                statusClass += ' status-in-progress';
                break;
            case '已完成':
                statusClass += ' status-completed';
                break;
            case '暂停':
                statusClass += ' status-paused';
                break;
        }

        taskDiv.innerHTML = `
            <div class="task-title">${taskName}</div>
            <div class="task-meta">
                <span class="${statusClass}">${status}</span>
                优先级: ${priority} | 负责人: ${assignee}
                ${dueDate ? ` | 截止: ${new Date(dueDate).toLocaleDateString('zh-CN')}` : ''}
            </div>
            ${description ? `<div style="margin-top: 8px; color: #666; font-size: 14px; line-height: 1.4;">${description}</div>` : ''}
            <div class="task-actions">
                <button class="btn btn-primary" onclick="taskManager.editTask('${task.record_id}')">✏️ 编辑</button>
                <button class="btn btn-success" onclick="taskManager.toggleStatus('${task.record_id}')">🔄 状态</button>
                <button class="btn btn-danger" onclick="taskManager.deleteTask('${task.record_id}')">🗑️ 删除</button>
            </div>
        `;

        return taskDiv;
    }

    async addTask() {
        const taskName = prompt('请输入任务名称:');
        if (!taskName) return;

        const project = prompt('请输入项目名称:', this.currentProject || '');
        if (!project) return;

        const status = prompt('请选择状态 (待开始/进行中/已完成/暂停/取消):', '待开始');
        const priority = prompt('请选择优先级 (低/中/高/紧急):', '中');
        const assignee = prompt('请输入负责人:');
        const description = prompt('请输入任务描述:');

        try {
            const fields = {};
            fields[FIELD_MAPPING.TASK_NAME] = taskName;
            fields[FIELD_MAPPING.PROJECT] = project;
            fields[FIELD_MAPPING.STATUS] = status;
            fields[FIELD_MAPPING.PRIORITY] = priority;
            if (assignee) fields[FIELD_MAPPING.ASSIGNEE] = assignee;
            if (description) fields[FIELD_MAPPING.DESCRIPTION] = description;

            await this.feishuAPI.createRecord(fields);
            await this.loadTasks();
            this.renderProjects();
            this.renderTasks();
            
            alert('任务创建成功！');
        } catch (error) {
            console.error('创建任务失败:', error);
            alert('创建任务失败: ' + error.message);
        }
    }

    async editTask(recordId) {
        const task = this.tasks.find(t => t.record_id === recordId);
        if (!task) return;

        const taskName = prompt('任务名称:', task.fields[FIELD_MAPPING.TASK_NAME] || '');
        if (taskName === null) return;

        const project = prompt('项目名称:', task.fields[FIELD_MAPPING.PROJECT] || '');
        if (project === null) return;

        const status = prompt('状态 (待开始/进行中/已完成/暂停/取消):', task.fields[FIELD_MAPPING.STATUS] || '');
        if (status === null) return;

        const priority = prompt('优先级 (低/中/高/紧急):', task.fields[FIELD_MAPPING.PRIORITY] || '');
        if (priority === null) return;

        try {
            const fields = {};
            if (taskName) fields[FIELD_MAPPING.TASK_NAME] = taskName;
            if (project) fields[FIELD_MAPPING.PROJECT] = project;
            if (status) fields[FIELD_MAPPING.STATUS] = status;
            if (priority) fields[FIELD_MAPPING.PRIORITY] = priority;

            await this.feishuAPI.updateRecord(recordId, fields);
            await this.loadTasks();
            this.renderProjects();
            this.renderTasks();
            
            alert('任务更新成功！');
        } catch (error) {
            console.error('更新任务失败:', error);
            alert('更新任务失败: ' + error.message);
        }
    }

    async deleteTask(recordId) {
        if (!confirm('确定要删除这个任务吗？')) return;

        try {
            await this.feishuAPI.deleteRecord(recordId);
            await this.loadTasks();
            this.renderProjects();
            this.renderTasks();
            
            alert('任务删除成功！');
        } catch (error) {
            console.error('删除任务失败:', error);
            alert('删除任务失败: ' + error.message);
        }
    }

    async generateDailyReport() {
        await this.generateReport('daily');
    }

    async generateWeeklyReport() {
        await this.generateReport('weekly');
    }

    async generateReport(type) {
        const reportContent = document.getElementById('reportContent');
        reportContent.style.display = 'block';
        reportContent.innerHTML = '正在生成报告...';

        try {
            const filteredTasks = this.currentProject 
                ? this.tasks.filter(task => task.fields[FIELD_MAPPING.PROJECT] === this.currentProject)
                : this.tasks;

            const report = await this.doubaoAPI.generateReport(filteredTasks, type);
            reportContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${report}</pre>`;
        } catch (error) {
            console.error('生成报告失败:', error);
            reportContent.innerHTML = '生成报告失败: ' + error.message;
        }
    }

    async toggleStatus(recordId) {
        const task = this.tasks.find(t => t.record_id === recordId);
        if (!task) return;

        const currentStatus = task.fields[FIELD_MAPPING.STATUS] || '待开始';
        let nextStatus;

        // 状态循环：待开始 -> 进行中 -> 已完成 -> 待开始
        switch(currentStatus) {
            case '待开始':
                nextStatus = '进行中';
                break;
            case '进行中':
                nextStatus = '已完成';
                break;
            case '已完成':
                nextStatus = '待开始';
                break;
            default:
                nextStatus = '进行中';
        }

        try {
            const fields = {};
            fields[FIELD_MAPPING.STATUS] = nextStatus;

            await this.feishuAPI.updateRecord(recordId, fields);
            await this.loadTasks();
            this.renderProjects();
            this.renderTasks();
        } catch (error) {
            console.error('切换状态失败:', error);
            alert('切换状态失败: ' + error.message);
        }
    }

    filterTasks() {
        const searchTerm = document.getElementById('searchBox').value.toLowerCase();
        const taskItems = document.querySelectorAll('.task-item');

        taskItems.forEach(item => {
            const title = item.querySelector('.task-title').textContent.toLowerCase();
            const meta = item.querySelector('.task-meta').textContent.toLowerCase();
            const description = item.querySelector('div[style*="color: #666"]');
            const descText = description ? description.textContent.toLowerCase() : '';

            if (title.includes(searchTerm) || meta.includes(searchTerm) || descText.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    showError(message) {
        const tasksContainer = document.getElementById('tasksList');
        tasksContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// 全局变量和函数
let taskManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
});

// 全局函数供HTML调用
function addTask() {
    if (taskManager) {
        taskManager.addTask();
    }
}

function generateDailyReport() {
    if (taskManager) {
        taskManager.generateDailyReport();
    }
}

function generateWeeklyReport() {
    if (taskManager) {
        taskManager.generateWeeklyReport();
    }
}

function filterTasks() {
    if (taskManager) {
        taskManager.filterTasks();
    }
}