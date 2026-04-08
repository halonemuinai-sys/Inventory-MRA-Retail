  /**
  * API.GS
  * Frontend API Wrappers
  * 
  * Provides clean API interface for frontend operations.
  */

  // --- GET APIs ---

  function apiGetAllData(year) {
    return {
      inventory: getData('Inventory'),
      otherDevices: getData('OtherDevices'),
      employees: getData('Employees'),
      masterData: getData('Master_Data'),
      config: getData('Config'),
      users: apiGetUsers(), // Reuse safe user fetch
      costAnalysis: calculateCostAnalysis(year),
      gisLocations: getGISLocationNames(),
      helpdeskTickets: getData('HelpdeskTickets'),
      saas: getData('SaaS_Licenses'),
      networkSLAs: getData('Network_SLA'),
      networkContracts: getData('Network_Contracts')
    };
  }

  function apiGetInventory() { 
    return getData('Inventory'); 
  }

  function apiGetOtherDevices() {
    return getData('OtherDevices');
  }

  function apiAddOtherDevice(data) {
    return addRow('OtherDevices', data);
  }

  function apiUpdateOtherDevice(data) {
    return updateRow('OtherDevices', data.id, data);
  }

  function apiDeleteOtherDevice(id) {
    return deleteRow('OtherDevices', id);
  }

  // --- SaaS APIs ---
  // --- SaaS APIs ---
  function apiAddSaaS(data) {
    const historyLog = data.newHistoryLog;
    delete data.newHistoryLog; // Remove from SaaS row payload
    
    // Auto-generate ID if missing to use in history
    if (!data.id) data.id = Utilities.getUuid();
    
    const res = addRow('SaaS_Licenses', data);
    if (res.success && historyLog) {
      addRow('AssetHistory', { assetId: data.id, action: 'SaaS Registered', notes: historyLog, date: new Date(), empName: 'System / Admin' });
    }
    return res;
  }
  
  function apiUpdateSaaS(data) {
    const historyLog = data.newHistoryLog;
    delete data.newHistoryLog;
    
    const res = updateRow('SaaS_Licenses', data.id, data);
    if (res.success && historyLog) {
       addRow('AssetHistory', { assetId: data.id, action: 'SaaS Renewed / Updated', notes: historyLog, date: new Date(), empName: 'System / Admin' });
    }
    return res;
  }
  function apiDeleteSaaS(id) {
    return deleteRow('SaaS_Licenses', id);
  }

  function apiGetEmployees() { 
    return getData('Employees'); 
  }

  function apiGetMasterData() { 
    return getData('Master_Data'); 
  }

  function apiGetConfig() { 
    return getData('Config'); 
  }

  // --- Auth APIs ---

  // --- Auth & User Management APIs ---

  function apiLogin(username, password) {
    const users = getData('Users');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      return { success: true, user: { name: user.name, role: user.role, username: user.username } };
    }
    return { success: false, message: "Username atau Password salah." };
  }

  function apiGetUsers() {
    const users = getData('Users');
    // Return users without passwords for security in frontend list
    return users.map(u => ({ username: u.username, name: u.name, role: u.role, password: u.password })); 
  }

  function apiAddUser(data) {
    // Check if username exists
    const users = getData('Users');
    if(users.find(u => u.username === data.username)) {
      return { success: false, message: "Username sudah digunakan." };
    }
    return addRow('Users', data);
  }

  function apiDeleteUser(username) {
    // Find ID by username (assuming username is unique, or we search by it)
    // Since we don't have IDs in the simple schema usually, we might need to find the row index or assume an ID column exists.
    // Based on Database.gs logic, if we deleteRow expecting an ID, we need an ID.
    // If 'Users' sheet has an 'id' column, we should use it. 
    // Let's assume for now we might need to find the user first.
    // If `deleteRow` requires an ID, we must pass it.
    // Let's check if we can pass a criteria. `deleteRow` usually takes an ID.
    // I will assume the frontend passes the ID if available, or I'll implement a deleteByUsername helper if needed.
    // Checking Database.gs would be ideal, but standard pattern here is ID.
    // For safety, I'll fetch the user to get the ID, then delete.
    const users = getData('Users');
    const user = users.find(u => u.username === username);
    if(user && user.id) {
      return deleteRow('Users', user.id);
    }
    return { success: false, message: "User tidak ditemukan." };
  }

  // --- Inventory APIs ---

  function apiAddInventory(data) { 
    return addRow('Inventory', data); 
  }

  function apiUpdateInventory(data) { 
    return updateRow('Inventory', data.id, data); 
  }

  function apiDeleteInventory(id) { 
    return deleteRow('Inventory', id); 
  }

  function apiBulkAddInventory(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return { success: false, message: "Data kosong atau tidak valid." };
    return addMultipleRows('Inventory', dataArray);
  }

  // --- Employee APIs ---

  function apiAddEmployee(data) { 
    const res = addRow('Employees', data);
    return res;
  }

  function apiUpdateEmployee(data) { 
    return updateRow('Employees', data.id, data); 
  }

  // --- Analysis & Business Logic APIs ---

  function apiRunCostAnalysis(year) { 
    return calculateCostAnalysis(year); 
  }

  // --- Master Data Wrapper APIs ---

  function apiAddMasterDataWrapper(c, v) { 
    return apiAddMasterData(c, v); 
  }

  function apiDeleteMasterDataWrapper(c, v) { 
    return apiDeleteMasterData(c, v); 
  }

  function apiSaveConfigWrapper(k, v) { 
    return apiSaveConfig(k, v); 
  }

  // --- Business Logic APIs ---

  function assignAssetToEmployee(empId, assetId) {
    const employees = getData('Employees');
    const inventory = getData('Inventory');
    
    const empIndex = employees.findIndex(e => e.id == empId || e.id === empId); // Handle string/int types
    const assetIndex = inventory.findIndex(i => i.id == assetId || i.id === assetId);
    
    if (empIndex === -1 || assetIndex === -1) {
      return { success: false, message: "Data Karyawan atau Aset tidak ditemukan." };
    }
    
    const emp = employees[empIndex];
    const asset = inventory[assetIndex];
    
    // Update Employee
    emp.assignedAssetId = asset.id; // Store ID
    updateRow('Employees', emp.id, emp);
    
    // Update Asset
    asset.status = 'Assigned';
    asset.assignedTo = emp.name;
    updateRow('Inventory', asset.id, asset);
    
    return { success: true };
  }

  function getBASTData(empId) {
    const employees = getData('Employees');
    const inventory = getData('Inventory');
    
    const emp = employees.find(e => e.id == empId);
    if (!emp) return { error: "Employee not found" };
    
    const asset = inventory.find(i => i.id == emp.assignedAssetId);
    
    return {
      employee: emp,
      asset: asset || null,
      date: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    };
  }

  // --- History & Offboarding APIs ---

  function logAssetHistory(assetId, action, empId, empName, notes) {
    const logData = {
      assetId: assetId,
      action: action,
      empId: empId || '',
      empName: empName || '',
      date: new Date(),
      notes: notes || ''
    };
    addRow('AssetHistory', logData);
  }

  function apiGetAssetHistory(assetId) {
    const allHistory = getData('AssetHistory');
    // Return logs for specific asset, sorted by date desc
    return allHistory.filter(h => h.assetId == assetId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function apiOffboardAsset(data) {
    // data: { assetId, status (Available/Returned/Maintenance/Rusak), notes }
    const inventory = getData('Inventory');
    const asset = inventory.find(i => i.id == data.assetId);
    
    if (!asset) return { success: false, message: "Aset tidak ditemukan" };
    
    const oldAssignee = asset.assignedTo;
    const employees = getData('Employees');
    const emp = employees.find(e => e.assignedAssetId == asset.id);
    
    // 1. Log History (Return/Offboard)
    logAssetHistory(asset.id, 'Return', emp ? emp.id : '', emp ? emp.name : oldAssignee, data.notes || `Changed status to ${data.status}`);
    
    // 2. Update Asset
    asset.status = data.status;
    asset.assignedTo = ''; // Clear assignment
    updateRow('Inventory', asset.id, asset);
    
    // 3. Update Employee (if any)
    if (emp) {
      emp.assignedAssetId = '';
      updateRow('Employees', emp.id, emp);
    }
    
    return { success: true };
  }

  // Override/Update assignAsset to log history
  function assignAssetToEmployee(empId, assetId) {
    const employees = getData('Employees');
    const inventory = getData('Inventory');
    
    const empIndex = employees.findIndex(e => e.id == empId || e.id === empId);
    const assetIndex = inventory.findIndex(i => i.id == assetId || i.id === assetId);
    
    if (empIndex === -1 || assetIndex === -1) {
      return { success: false, message: "Data Karyawan atau Aset tidak ditemukan." };
    }
    
    const emp = employees[empIndex];
    const asset = inventory[assetIndex];
    
    // Log History (Assign)
    logAssetHistory(asset.id, 'Assign', emp.id, emp.name, 'Assigned via System');
    
    // Update Employee
    emp.assignedAssetId = asset.id;
    updateRow('Employees', emp.id, emp);
    
    // Update Asset
    asset.status = 'Assigned';
    asset.assignedTo = emp.name;
    updateRow('Inventory', asset.id, asset);
    
    return { success: true };
  }
  function apiSetupDatabase() {
    return setupDatabase();
  }

  // --- Ticket APIs ---

  function apiAddTicket(data) {
    // data: { ticketDate, reporterId, reporterName, issueCategory, priority, subject, description, assetId, assetName, status, resolution }
    // Auto-generate ID or use addRow's mechanism
    return addRow('Tickets', data);
  }

  function apiGetTickets() {
    const tickets = getData('Tickets');
    // Sort by date desc
    return tickets.sort((a, b) => new Date(b.ticketDate) - new Date(a.ticketDate));
  }

  function apiResolveTicket(id) {
    const tickets = getData('Tickets');
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
      ticket.status = 'Resolved';
      ticket.resolution = 'Resolved by User';
      ticket.updatedAt = new Date();
      return updateRow('Tickets', id, ticket);
    }
    return { success: false, message: "Tiket tidak ditemukan" };
  }

  // --- Helpdesk Ticketing System APIs ---

  function apiAddHelpdeskTicket(data) {
    // Auto-generate Ticket ID: HD-YYYYMMDD-XXX
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    const existing = getData('HelpdeskTickets');
    const todayTickets = existing.filter(t => String(t.id).startsWith('HD-' + dateStr));
    const seq = String(todayTickets.length + 1).padStart(3, '0');
    
    data.id = 'HD-' + dateStr + '-' + seq;
    data.ticketDate = data.ticketDate || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    data.ticketTime = data.ticketTime || Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');
    data.status = 'Open';
    data.slaStatus = '';
    data.impactLevel = data.impactLevel || '';
    data.responseDate = '';
    data.responseTime = '';
    data.resolvedDate = '';
    data.resolvedTime = '';
    
    return addRow('HelpdeskTickets', data);
  }

  function apiGetHelpdeskTickets() {
    const tickets = getData('HelpdeskTickets');
    return tickets.sort((a, b) => {
      // Sort: Open first, then by priority (High first), then by date desc
      const statusOrder = { 'Open': 0, 'In Progress': 1, 'Pending Vendor': 2, 'Resolved': 3, 'Closed': 4 };
      const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
      const sA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 5;
      const sB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 5;
      if (sA !== sB) return sA - sB;
      const pA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 3;
      const pB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 3;
      if (pA !== pB) return pA - pB;
      return new Date(b.ticketDate) - new Date(a.ticketDate);
    });
  }

  function apiUpdateHelpdeskTicket(data) {
    if (!data.id) return { success: false, message: "Ticket ID required" };
    
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');

    // If status is "In Progress" and response info is missing, fill it
    if (data.status === 'In Progress' && (!data.responseDate || data.responseDate === '')) {
      data.responseDate = dateStr;
      data.responseTime = timeStr;
    }
    
    // If status is "Resolved" or "Closed" and resolved info is missing, fill it
    if ((data.status === 'Resolved' || data.status === 'Closed') && (!data.resolvedDate || data.resolvedDate === '')) {
      data.resolvedDate = dateStr;
      data.resolvedTime = timeStr;
    }
    
    return updateRow('HelpdeskTickets', data.id, data);
  }

  function apiGetHelpdeskDashboard() {
    const tickets = getData('HelpdeskTickets');
    
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'Open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
    const pendingVendor = tickets.filter(t => t.status === 'Pending Vendor').length;
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    
    // Per Location
    const perLocation = {};
    tickets.forEach(t => {
      perLocation[t.location] = (perLocation[t.location] || 0) + 1;
    });
    
    // Per Category
    const perCategory = {};
    tickets.forEach(t => {
      perCategory[t.category] = (perCategory[t.category] || 0) + 1;
    });
    
    // SLA Stats
    const slaAchieved = tickets.filter(t => t.slaStatus === 'Achieved').length;
    const slaBreached = tickets.filter(t => t.slaStatus === 'Breached').length;
    const slaPending = totalTickets - slaAchieved - slaBreached;
    
    // Downtime per location (tickets with impactLevel = 'Sistem Down')
    const downtimePerLocation = {};
    tickets.forEach(t => {
      if (t.impactLevel === 'Sistem Down') {
        if (!downtimePerLocation[t.location]) downtimePerLocation[t.location] = { count: 0, totalMinutes: 0 };
        downtimePerLocation[t.location].count++;
        // Calculate duration if resolved
        if (t.ticketDate && t.ticketTime && t.resolvedDate && t.resolvedTime) {
          const start = new Date(t.ticketDate + 'T' + t.ticketTime);
          const end = new Date(t.resolvedDate + 'T' + t.resolvedTime);
          const diffMinutes = Math.max(0, (end - start) / (1000 * 60));
          downtimePerLocation[t.location].totalMinutes += diffMinutes;
        }
      }
    });
    
    // Resolution rate
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
    
    // Average response time (minutes) for tickets that have responseDate
    let totalResponseMinutes = 0;
    let responseCount = 0;
    tickets.forEach(t => {
      if (t.ticketDate && t.ticketTime && t.responseDate && t.responseTime) {
        const start = new Date(t.ticketDate + 'T' + t.ticketTime);
        const end = new Date(t.responseDate + 'T' + t.responseTime);
        const diff = Math.max(0, (end - start) / (1000 * 60));
        totalResponseMinutes += diff;
        responseCount++;
      }
    });
    const avgResponseMinutes = responseCount > 0 ? Math.round(totalResponseMinutes / responseCount) : 0;
    
    // Average resolution time (minutes) for resolved tickets
    let totalResolveMinutes = 0;
    let resolveCount = 0;
    tickets.forEach(t => {
      if (t.ticketDate && t.ticketTime && t.resolvedDate && t.resolvedTime) {
        const start = new Date(t.ticketDate + 'T' + t.ticketTime);
        const end = new Date(t.resolvedDate + 'T' + t.resolvedTime);
        const diff = Math.max(0, (end - start) / (1000 * 60));
        totalResolveMinutes += diff;
        resolveCount++;
      }
    });
    const avgResolveMinutes = resolveCount > 0 ? Math.round(totalResolveMinutes / resolveCount) : 0;
    
    return {
      totalTickets, openTickets, inProgressTickets, pendingVendor, resolvedTickets,
      perLocation, perCategory,
      slaAchieved, slaBreached, slaPending,
      downtimePerLocation,
      resolutionRate, avgResponseMinutes, avgResolveMinutes
    };
  }

  // --- Network SLA & Contracts APIs ---

  function apiGetNetworkSLA() {
    return getData('Network_SLA');
  }

  function apiAddNetworkSLA(data) {
    return addRow('Network_SLA', data);
  }
  
  function apiUpdateNetworkSLA(data) {
    return updateRow('Network_SLA', data.id, data);
  }

  function apiDeleteNetworkSLA(id) {
    return deleteRow('Network_SLA', id);
  }

  function apiGetNetworkContracts() {
    return getData('Network_Contracts');
  }

  function apiAddNetworkContract(data) {
    if (data.monthlyCost) {
      // Remove formatting (e.g. dots) before calculation
      const mCost = parseFloat(String(data.monthlyCost || 0).replace(/\./g, ''));
      data.annualCost = mCost * 12;
    }
    return addRow('Network_Contracts', data);
  }

  function apiUpdateNetworkContract(data) {
    if (data.monthlyCost) {
      const mCost = parseFloat(String(data.monthlyCost || 0).replace(/\./g, ''));
      data.annualCost = mCost * 12;
    }
    return updateRow('Network_Contracts', data.id, data);
  }

  function apiDeleteNetworkContract(id) {
    return deleteRow('Network_Contracts', id);
  }
