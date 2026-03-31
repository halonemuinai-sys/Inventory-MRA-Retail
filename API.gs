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
    gisLocations: getGISLocationNames()
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
