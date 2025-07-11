// 配置文件
const CONFIG = {
    FEISHU: {
        APP_ID: 'cli_a8d4bd05dbf8100b',
        APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
        // 根据环境选择API端点
        BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? window.location.origin + '/api/feishu'  // 本地开发
            : '/.netlify/functions/feishu-proxy',     // Netlify部署
        // 你的多维表格相关配置
        BITABLE_ID: 'DPIqbB7OWa05ZZsiQi8cP1jnnBb', // 从URL中提取
        TABLE_ID: 'tblAyK0L5R7iuKWz' // 从URL中提取
    },
    DOUBAO: {
        BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? window.location.origin + '/api/doubao/chat'  // 本地开发
            : '/.netlify/functions/doubao-proxy',          // Netlify部署
        API_KEY: 'e90111f2-f6a4-40c3-a657-b8383007166f',
        MODEL: 'doubao-seed-1-6-thinking-250615'
    }
};

// 字段映射 - 根据飞书表格实际字段调整
const FIELD_MAPPING = {
    TASK_NAME: '任务名称',
    PROJECT: '项目',
    STATUS: '状态',
    PRIORITY: '优先级',
    ASSIGNEE: '负责人',
    DUE_DATE: '截止时间',
    DESCRIPTION: '描述',
    CREATED_TIME: '创建时间',
    UPDATED_TIME: '更新时间'
};

// 状态选项
const STATUS_OPTIONS = ['待开始', '进行中', '已完成', '暂停', '取消'];
const PRIORITY_OPTIONS = ['低', '中', '高', '紧急'];