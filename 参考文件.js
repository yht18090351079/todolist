// 飞书API集成模块 - 静态版本
class FeishuAPI {
    constructor() {
        // 飞书配置
        this.config = {
            APP_ID: 'cli_a8d4bd05dbf8100b',
            APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
            SPREADSHEET_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze',
            ROSTER_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw'
        };
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    // 获取访问令牌
    async getAccessToken() {
        try {
            // 检查是否有有效的令牌
            if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return { success: true, token: this.accessToken };
            }

            console.log('获取飞书访问令牌...');

            // 使用CORS代理
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

            const response = await fetch(proxyUrl + targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    app_id: this.config.APP_ID,
                    app_secret: this.config.APP_SECRET
                })
            });

            const data = await response.json();

            if (data.code === 0) {
                this.accessToken = data.tenant_access_token;
                this.tokenExpiry = Date.now() + (data.expire - 300) * 1000; // 提前5分钟过期
                console.log('✅ 访问令牌获取成功');
                return { success: true, token: this.accessToken };
            } else {
                throw new Error(`获取访问令牌失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ 获取飞书访问令牌失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 解析飞书URL
    parseFeishuUrl(url) {
        try {
            const match = url.match(/\/base\/([a-zA-Z0-9]+)/);
            if (!match) {
                throw new Error('无法解析飞书表格URL');
            }
            
            return {
                success: true,
                appToken: match[1]
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 解析花名册URL
    parseRosterUrl(url) {
        try {
            const urlObj = new URL(url);
            const tableId = urlObj.searchParams.get('table');
            const pathMatch = urlObj.pathname.match(/\/base\/([a-zA-Z0-9]+)/);
            
            if (!tableId || !pathMatch) {
                throw new Error('无法解析花名册URL');
            }
            
            return {
                success: true,
                appToken: pathMatch[1],
                tableId: tableId
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取数据表列表
    async getTables(appToken) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`;

            const response = await fetch(proxyUrl + targetUrl, {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (data.code === 0) {
                return { success: true, tables: data.data.items };
            } else {
                throw new Error(`获取数据表失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('获取飞书数据表失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取表格字段信息
    async getTableFields(appToken, tableId) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`;

            const response = await fetch(proxyUrl + targetUrl, {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (data.code === 0) {
                return { success: true, fields: data.data.items };
            } else {
                throw new Error(`获取字段信息失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('获取飞书表格字段失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取表格记录
    async getTableRecords(appToken, tableId) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;

            const response = await fetch(proxyUrl + targetUrl, {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (data.code === 0) {
                return { success: true, records: data.data.items };
            } else {
                throw new Error(`获取表格记录失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('获取飞书表格记录失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 写入数据到表格
    async writeToTable(appToken, tableId, data) {
        try {
            const tokenResult = await this.getAccessToken();
            if (!tokenResult.success) {
                return tokenResult;
            }

            console.log('写入数据到飞书表格:', data);

            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;

            const response = await fetch(proxyUrl + targetUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    records: [{ fields: data }]
                })
            });

            const result = await response.json();
            console.log('飞书API响应:', result);

            if (result.code === 0) {
                console.log('✅ 数据写入成功');
                return { success: true, data: result.data };
            } else {
                throw new Error(`写入数据失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('❌ 写入飞书表格失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 从花名册获取申请人数据
    async getApplicantsFromRoster() {
        try {
            console.log('从飞书花名册获取申请人数据...');
            const rosterInfo = this.parseRosterUrl(this.config.ROSTER_URL);
            if (!rosterInfo.success) {
                throw new Error(rosterInfo.error);
            }

            const recordsResult = await this.getTableRecords(rosterInfo.appToken, rosterInfo.tableId);
            if (!recordsResult.success) {
                throw new Error(recordsResult.error);
            }

            const applicants = recordsResult.records.map(record => {
                const fields = record.fields;
                return {
                    id: record.record_id,
                    name: fields['姓名'] || fields['申请人'] || fields['名字'] || '',
                    department: fields['部门'] || fields['申请部门'] || fields['所属部门'] || ''
                };
            }).filter(applicant => applicant.name && applicant.department);

            console.log('✅ 从花名册获取到申请人:', applicants.length, '人');
            return { success: true, data: applicants };
        } catch (error) {
            console.error('❌ 从花名册获取申请人失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 查找或创建月份表格
    async findOrCreateMonthTable(appToken, monthName) {
        try {
            const tablesResult = await this.getTables(appToken);
            if (!tablesResult.success) {
                return tablesResult;
            }

            // 查找是否已存在该月份的表格
            const existingTable = tablesResult.tables.find(table => 
                table.name === monthName || table.name.includes(monthName)
            );

            if (existingTable) {
                console.log(`✅ 找到现有表格: ${existingTable.name}`);
                return {
                    success: true,
                    table: existingTable,
                    isNew: false
                };
            }

            // 如果不存在，使用第一个表格作为默认
            console.log('⚠️ 未找到月份表格，使用第一个可用表格');
            return {
                success: true,
                table: tablesResult.tables[0],
                isNew: false
            };
        } catch (error) {
            console.error('查找月份表格失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 提交费用数据
    async submitExpense(expenseData) {
        try {
            console.log('开始提交费用数据到飞书...');
            console.log('接收到的费用数据:', expenseData);
            console.log('申请月份:', expenseData.reportMonth);
            console.log('测试模式:', expenseData.isTestMode);

            const tableInfo = this.parseFeishuUrl(this.config.SPREADSHEET_URL);
            if (!tableInfo.success) {
                return tableInfo;
            }

            // 根据测试模式选择表格
            let tableResult;
            if (expenseData.isTestMode) {
                // 测试模式：使用"测试"表格
                tableResult = await this.findOrCreateMonthTable(tableInfo.appToken, '测试');
            } else {
                // 正常模式：使用"6月"表格（或其他月份表格）
                tableResult = await this.findOrCreateMonthTable(tableInfo.appToken, '6月');
            }

            if (!tableResult.success) {
                return tableResult;
            }

            const table = tableResult.table;
            console.log(`使用表格: ${table.name}`);

            // 获取表格字段信息
            const fieldsResult = await this.getTableFields(tableInfo.appToken, table.table_id);
            if (!fieldsResult.success) {
                return fieldsResult;
            }

            // 映射数据到表格字段
            const dataMapping = {
                '申请人': String(expenseData.applicant),
                '申请部门': String(expenseData.applicantDepartment || ''),
                '申请月份': String(expenseData.reportMonth || ''),
                '出差日期': expenseData.selectedDates ? expenseData.selectedDates.join(', ') : '',
                '差补类型': expenseData.allowanceType === '90' ? '实施' : '商务',
                '应享受差补天数': String(expenseData.travelDays),
                '差补金额': String(expenseData.travelAllowanceAmount),
                '应享受餐补天数': String(expenseData.mealDays),
                '餐补金额': String(expenseData.mealAllowanceAmount),
                '合计': String(expenseData.totalAmount)
            };

            // 检查字段是否存在并准备最终数据
            const availableFieldNames = fieldsResult.fields.map(f => f.field_name);
            console.log('表格中可用的字段名:', availableFieldNames);
            console.log('准备映射的数据:', dataMapping);

            const finalData = {};
            for (const [fieldName, value] of Object.entries(dataMapping)) {
                if (availableFieldNames.includes(fieldName)) {
                    finalData[fieldName] = value;
                    console.log(`✅ 映射字段: ${fieldName} = ${value}`);
                } else {
                    console.log(`❌ 字段不存在: ${fieldName}`);
                }
            }

            console.log('最终提交的数据:', finalData);

            // 写入数据
            const writeResult = await this.writeToTable(tableInfo.appToken, table.table_id, finalData);
            return writeResult;

        } catch (error) {
            console.error('❌ 提交费用数据失败:', error);
            return { success: false, error: error.message };
        }
    }
}

// 创建带回退机制的API包装器
class FeishuAPIWrapper {
    constructor() {
        this.primaryAPI = new FeishuAPI();
        this.fallbackAPI = null;
        this.useFallback = false;
    }

    async initializeFallback() {
        if (!this.fallbackAPI && window.feishuAPIAlternative) {
            this.fallbackAPI = window.feishuAPIAlternative;
        }
    }

    async getApplicantsFromRoster() {
        try {
            if (this.useFallback) {
                await this.initializeFallback();
                return await this.fallbackAPI.getApplicantsFromRoster();
            }

            const result = await this.primaryAPI.getApplicantsFromRoster();
            return result;
        } catch (error) {
            console.warn('主API失败，切换到备用方案:', error.message);
            this.useFallback = true;
            await this.initializeFallback();
            return await this.fallbackAPI.getApplicantsFromRoster();
        }
    }

    async submitExpense(expenseData) {
        try {
            if (this.useFallback) {
                await this.initializeFallback();
                return await this.fallbackAPI.submitExpense(expenseData);
            }

            const result = await this.primaryAPI.submitExpense(expenseData);
            return result;
        } catch (error) {
            console.warn('主API失败，切换到备用方案:', error.message);
            this.useFallback = true;
            await this.initializeFallback();
            return await this.fallbackAPI.submitExpense(expenseData);
        }
    }

    async getAccessToken() {
        if (this.useFallback) {
            await this.initializeFallback();
            return await this.fallbackAPI.getAccessToken();
        }
        return await this.primaryAPI.getAccessToken();
    }
}

// 创建全局实例
window.feishuAPI = new FeishuAPIWrapper();
console.log('✅ 飞书API模块已加载（带回退机制）');
