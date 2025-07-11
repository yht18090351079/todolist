// 飞书API - 使用本地代理服务器
class FeishuAPIProxy {
    constructor() {
        // 代理服务器地址
        this.proxyUrl = window.location.origin.includes('localhost')
            ? 'http://localhost:3002'
            : window.location.origin + '/.netlify/functions';
        console.log('🔧 API代理URL:', this.proxyUrl);
    }

    // 从花名册获取申请人数据
    async getApplicantsFromRoster() {
        try {
            console.log('从飞书花名册获取申请人数据...');
            
            const response = await fetch(`${this.proxyUrl}/applicants`);
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ 从飞书花名册获取到申请人:', result.data.length, '人');
                if (result.source === 'fallback') {
                    console.log('⚠️ 使用备用数据，原因:', result.error);
                }
                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || '获取申请人失败');
            }
        } catch (error) {
            console.error('❌ 获取申请人失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 提交费用数据
    async submitExpense(expenseData) {
        try {
            console.log('开始提交费用数据到飞书...');
            console.log('=== 代理API发送的数据 ===');
            console.log('expenseData:', JSON.stringify(expenseData, null, 2));
            console.log('reportMonth值:', expenseData.reportMonth);

            const response = await fetch(`${this.proxyUrl}/submit-expense`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expenseData)
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ 费用数据提交成功');
                console.log('写入表格:', result.table);
                console.log('记录ID:', result.data?.records?.[0]?.record_id);
                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || '提交失败');
            }
        } catch (error) {
            console.error('❌ 提交费用数据失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 健康检查
    async checkHealth() {
        try {
            const response = await fetch(`${this.proxyUrl}/health`);
            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取访问令牌（兼容性方法）
    async getAccessToken() {
        // 代理模式下不需要前端获取令牌
        return { success: true, token: 'proxy_mode' };
    }
}

// 创建全局实例
window.feishuAPI = new FeishuAPIProxy();
console.log('✅ 飞书API代理模块已加载');




// 全局变量
let applicants = [];
let selectedDates = [];
let currentCalendarDate = new Date();

// DOM元素
const departmentSelect = document.getElementById('department');
const applicantSelect = document.getElementById('applicant');
const travelDaysCount = document.getElementById('travelDaysCount');
const allowanceTypeSelect = document.getElementById('allowanceType');
const mealDaysInput = document.getElementById('mealDays');
const travelAllowanceAmount = document.getElementById('travelAllowanceAmount');
const mealAllowanceAmount = document.getElementById('mealAllowanceAmount');
const totalAmount = document.getElementById('totalAmount');
const expenseForm = document.getElementById('expenseForm');

// 日历元素
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthSpan = document.getElementById('currentMonth');
const calendarGrid = document.getElementById('calendarGrid');
const selectedDatesDiv = document.getElementById('selectedDates');



// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 应用初始化开始...');

    // 延迟一点确保DOM完全加载
    setTimeout(() => {
        try {
            initializeCalendar();
            initializeMonthOptions();
            loadApplicants();
            bindEvents();
            console.log('✅ 应用初始化完成');
        } catch (error) {
            console.error('❌ 初始化过程中发生错误:', error);
        }
    }, 100);
});

// 初始化日历（默认显示上月）
function initializeCalendar() {
    const now = new Date();
    // 默认显示上个月
    currentCalendarDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    renderCalendar();
    updateSelectedDatesDisplay();
}

// 初始化月份选项
function initializeMonthOptions() {
    try {
        const reportMonthSelect = document.getElementById('reportMonth');

        if (!reportMonthSelect) {
            console.error('❌ 找不到申请月份选择框元素，ID: reportMonth');
            return;
        }

        // 清空现有选项（保留第一个默认选项）
        const defaultOption = reportMonthSelect.querySelector('option[value=""]');
        reportMonthSelect.innerHTML = '';
        if (defaultOption) {
            reportMonthSelect.appendChild(defaultOption);
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 当前月份 (1-12)
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1; // 上个月



        // 生成1-12月的选项
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month.toString();
            option.textContent = `${month}月`;

            // 默认选中上个月
            if (month === lastMonth) {
                option.selected = true;
            }

            reportMonthSelect.appendChild(option);
        }



    } catch (error) {
        console.error('❌ 初始化月份选项时发生错误:', error);
    }
}



// 获取当前应该填报的月份
function getCurrentReportMonth() {
    const reportMonthSelect = document.getElementById('reportMonth');
    const selectedValue = reportMonthSelect.value;

    if (selectedValue) {
        const month = parseInt(selectedValue);
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: month,
            monthName: `${month}月`
        };
    }

    // 如果没有选择，返回上个月作为默认值
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    return {
        year: now.getFullYear(),
        month: lastMonth,
        monthName: `${lastMonth}月`
    };
}

// 渲染日历
function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // 更新月份标题
    currentMonthSpan.textContent = currentCalendarDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long'
    });

    // 清空日历网格
    calendarGrid.innerHTML = '';

    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // 生成日历天数
    const today = new Date();
    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = currentDate.getDate();
        
        // 添加样式类
        if (currentDate.getMonth() !== month) {
            dayElement.classList.add('other-month');
        }
        
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // 检查是否已选择
        const dateString = currentDate.toISOString().split('T')[0];
        if (selectedDates.includes(dateString)) {
            dayElement.classList.add('selected');
        }
        
        // 添加点击事件
        if (currentDate.getMonth() === month) {
            dayElement.addEventListener('click', () => toggleDateSelection(dateString, dayElement));
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

// 切换日期选择
function toggleDateSelection(dateString, dayElement) {
    const index = selectedDates.indexOf(dateString);
    
    if (index > -1) {
        // 取消选择
        selectedDates.splice(index, 1);
        dayElement.classList.remove('selected');
    } else {
        // 添加选择
        selectedDates.push(dateString);
        dayElement.classList.add('selected');
    }
    
    // 排序日期
    selectedDates.sort();
    
    // 更新显示和计算
    updateSelectedDatesDisplay();
    updateTravelDaysCount();
    calculateAmounts();
}

// 更新选中日期显示
function updateSelectedDatesDisplay() {
    if (selectedDates.length === 0) {
        selectedDatesDiv.innerHTML = '<span class="no-dates">请选择出差日期</span>';
        return;
    }
    
    selectedDatesDiv.innerHTML = selectedDates.map(dateString => {
        const date = new Date(dateString + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <span class="selected-date-tag">
                ${formattedDate}
                <button type="button" class="remove-date" onclick="removeDateSelection('${dateString}')">×</button>
            </span>
        `;
    }).join('');
}

// 移除日期选择
function removeDateSelection(dateString) {
    const index = selectedDates.indexOf(dateString);
    if (index > -1) {
        selectedDates.splice(index, 1);
        updateSelectedDatesDisplay();
        updateTravelDaysCount();
        calculateAmounts();
        renderCalendar(); // 重新渲染日历以更新样式
    }
}

// 更新差补天数
function updateTravelDaysCount() {
    const days = selectedDates.length;
    travelDaysCount.textContent = days;
    
    // 自动更新餐补天数（如果用户没有手动修改）
    if (!mealDaysInput.dataset.userModified) {
        mealDaysInput.value = days;
    }
}

// 计算金额
function calculateAmounts() {
    const travelDays = parseInt(travelDaysCount.textContent) || 0;
    const allowanceType = allowanceTypeSelect.value;
    const mealDays = parseInt(mealDaysInput.value) || 0;
    
    // 计算差补金额
    let travelAmount = 0;
    if (allowanceType === '90') {
        travelAmount = travelDays * 90;
    } else if (allowanceType === '60') {
        travelAmount = travelDays * 60;
    }
    
    // 计算餐补金额（30元/天）
    const mealAmount = mealDays * 30;
    
    // 计算总金额
    const total = travelAmount + mealAmount;
    
    // 更新显示
    travelAllowanceAmount.textContent = travelAmount;
    mealAllowanceAmount.textContent = mealAmount;
    totalAmount.textContent = total;
}

// 绑定事件
function bindEvents() {
    // 日历导航
    prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    
    // 部门和申请人选择
    departmentSelect.addEventListener('change', handleDepartmentChange);
    applicantSelect.addEventListener('change', handleApplicantChange);
    
    // 差补类型变化
    allowanceTypeSelect.addEventListener('change', calculateAmounts);
    
    // 餐补天数变化
    mealDaysInput.addEventListener('input', () => {
        mealDaysInput.dataset.userModified = 'true';
        calculateAmounts();
    });
    
    // 表单提交
    expenseForm.addEventListener('submit', handleFormSubmit);
    
    // 表单重置
    expenseForm.addEventListener('reset', () => {
        selectedDates = [];
        mealDaysInput.dataset.userModified = 'false';
        updateSelectedDatesDisplay();
        updateTravelDaysCount();
        calculateAmounts();
        renderCalendar();
    });
    
    // 模态框关闭
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// 加载申请人列表
async function loadApplicants() {
    try {

        
        // 首先尝试从飞书花名册获取
        const feishuResult = await window.feishuAPI.getApplicantsFromRoster();
        
        if (feishuResult.success && feishuResult.data.length > 0) {
            console.log('✅ 从飞书花名册获取到申请人:', feishuResult.data.length, '人');
            applicants = feishuResult.data;
        } else {
            console.log('⚠️ 飞书花名册获取失败，使用本地数据');
            // 使用本地备用数据
            applicants = [
                { id: 1, name: '张三', department: '技术部' },
                { id: 2, name: '李四', department: '市场部' },
                { id: 3, name: '王五', department: '财务部' },
                { id: 4, name: '赵六', department: '人事部' },
                { id: 5, name: '袁昊天', department: '商务部' },
                { id: 6, name: '陈小明', department: '技术部' },
                { id: 7, name: '刘小红', department: '人事部' },
                { id: 8, name: '王大力', department: '市场部' }
            ];
        }
        
        updateDepartmentSelect();
        updateApplicantSelect();
        
    } catch (error) {
        console.error('加载申请人失败:', error);
        showMessage('加载申请人失败，使用本地数据', 'warning');
        
        // 使用本地备用数据
        applicants = [
            { id: 1, name: '张三', department: '技术部' },
            { id: 2, name: '李四', department: '市场部' },
            { id: 3, name: '王五', department: '财务部' },
            { id: 4, name: '赵六', department: '人事部' },
            { id: 5, name: '袁昊天', department: '商务部' },
            { id: 6, name: '陈小明', department: '技术部' },
            { id: 7, name: '刘小红', department: '人事部' },
            { id: 8, name: '王大力', department: '市场部' }
        ];
        
        updateDepartmentSelect();
        updateApplicantSelect();
    }
}

// 处理部门选择
function handleDepartmentChange() {
    const selectedDepartment = departmentSelect.value;
    updateApplicantSelect(selectedDepartment);
}

// 处理申请人选择
function handleApplicantChange() {
    // 申请人选择后的逻辑可以在这里添加
}

// 更新部门下拉框
function updateDepartmentSelect() {
    const departments = [...new Set(applicants.map(a => a.department))].sort();
    departmentSelect.innerHTML = '<option value="">请选择部门</option>';
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        departmentSelect.appendChild(option);
    });
}

// 更新申请人下拉框
function updateApplicantSelect(selectedDepartment = '') {
    if (!selectedDepartment) {
        applicantSelect.innerHTML = '<option value="">请先选择部门</option>';
        applicantSelect.disabled = true;
        return;
    }

    const filteredApplicants = applicants.filter(a => a.department === selectedDepartment);
    applicantSelect.innerHTML = '<option value="">请选择申请人</option>';
    applicantSelect.disabled = false;

    filteredApplicants.forEach(applicant => {
        const option = document.createElement('option');
        option.value = applicant.name;
        option.textContent = applicant.name;
        applicantSelect.appendChild(option);
    });
}

// 表单验证
function validateForm() {
    const reportMonthSelect = document.getElementById('reportMonth');

    if (!reportMonthSelect.value) {
        showMessage('请选择申请月份', 'error');
        return false;
    }

    if (!departmentSelect.value) {
        showMessage('请选择申请部门', 'error');
        return false;
    }

    if (!applicantSelect.value) {
        showMessage('请选择申请人', 'error');
        return false;
    }

    if (selectedDates.length === 0) {
        showMessage('请选择出差日期', 'error');
        return false;
    }

    if (!allowanceTypeSelect.value) {
        showMessage('请选择差补类型', 'error');
        return false;
    }

    return true;
}

// 处理表单提交
async function handleFormSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    showLoading(submitButton, '提交中...');

    const reportMonth = getCurrentReportMonth();
    const formData = {
        applicant: applicantSelect.value,
        applicantDepartment: departmentSelect.value,
        selectedDates: selectedDates,
        reportMonth: reportMonth.monthName,
        travelDays: parseInt(travelDaysCount.textContent),
        allowanceType: allowanceTypeSelect.value,
        mealDays: parseInt(mealDaysInput.value),
        travelAllowanceAmount: parseInt(travelAllowanceAmount.textContent),
        mealAllowanceAmount: parseInt(mealAllowanceAmount.textContent),

        totalAmount: parseInt(totalAmount.textContent),
        submitTime: new Date().toISOString()
    };

    try {
        console.log('开始提交费用数据到飞书...');

        // 直接使用飞书API提交数据
        const result = await window.feishuAPI.submitExpense(formData);

        if (result.success) {
            showMessage('📊 提交成功！数据已写入飞书表格', 'success');
            console.log('✅ 费用数据提交成功，记录ID:', result.data?.records?.[0]?.record_id);
            expenseForm.reset();
            initializeCalendar();
        } else {
            showMessage('提交失败：' + (result.error || '未知错误'), 'error');
            console.error('❌ 费用数据提交失败:', result.error);
        }
    } catch (error) {
        console.error('提交失败:', error);
        showMessage('提交失败：' + error.message, 'error');
    } finally {
        hideLoading(submitButton);
    }
}

// 显示消息
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer') || createMessageContainer();

    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;

    messageContainer.appendChild(messageElement);

    // 3秒后自动移除
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// 创建消息容器
function createMessageContainer() {
    let container = document.getElementById('messageContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
    }
    return container;
}

// 显示加载状态
function showLoading(button, text) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = `<span class="loading"></span> ${text}`;
}

// 隐藏加载状态
function hideLoading(button) {
    button.disabled = false;
    button.textContent = button.dataset.originalText || '提交申请';
}

console.log('✅ 主应用脚本已加载');
