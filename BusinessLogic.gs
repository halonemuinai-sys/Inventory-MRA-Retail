/**
 * BUSINESSLOGIC.GS
 * Business Rules & Logic
 * 
 * Implements business-specific operations and calculations.
 */

/**
 * Assign an asset to an employee
 */
function assignAssetToEmployee(employeeId, assetId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const employees = getData('Employees');
    const employee = employees.find(e => e.id == employeeId);
    if (!employee) throw new Error("Karyawan tidak ditemukan");

    updateRow('Employees', employeeId, { 'assignedAssetId': assetId, 'status': 'Active' });
    updateRow('Inventory', assetId, { 'status': 'Assigned', 'assignedTo': employee.name });
    return { success: true, employee: employee };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Calculate cost analysis by company and month
 */
function calculateCostAnalysis(year, deviceType) {
  const inventory = getData('Inventory');
  const selectedYear = year || new Date().getFullYear();
  let analysis = {};

  // Define category filters
  const laptopCategories = ['', 'PC/Laptop', 'Laptop'];
  const mobileCategories = ['Mobile Device', 'Tablet', 'Smartphone'];

  inventory.forEach(item => {
    if (String(item.type).toLowerCase() === 'sewa') {
      // Filter by deviceType if specified
      const cat = String(item.deviceCategory || '').trim();
      
      if (deviceType === 'Laptop') {
        // Only include laptop/PC items (empty category = legacy laptop data)
        if (!laptopCategories.includes(cat)) return;
      } else if (deviceType === 'Mobile') {
        // Only include mobile items
        if (!mobileCategories.includes(cat)) return;
      }
      // If no deviceType specified, include all (backward compatible)

      const company = item.company || 'Unassigned';
      if (!analysis[company]) analysis[company] = new Array(12).fill(0);

      const start = new Date(item.rentalStart);
      const end = new Date(item.rentalEnd);
      const cost = parseFloat(item.rentalCost) || 0;

      for (let month = 0; month < 12; month++) {
        let checkDate = new Date(selectedYear, month, 1);
        let checkEndDate = new Date(selectedYear, month + 1, 0); 
        if (start <= checkEndDate && end >= checkDate) {
          analysis[company][month] += cost;
        }
      }
    }
  });
  return analysis;
}

/**
 * Get BAST (Berita Acara Serah Terima) data for an employee
 */
function getBASTData(employeeId) {
  const employees = getData('Employees');
  const employee = employees.find(e => e.id == employeeId);
  if (!employee) throw new Error("Karyawan tidak ditemukan");
  
  if (!employee.assignedAssetId) {
     return { employee: employee, asset: null, date: new Date().toLocaleDateString('id-ID') };
  }

  const inventory = getData('Inventory');
  const asset = inventory.find(a => a.id == employee.assignedAssetId);

  return {
    employee: employee,
    asset: asset,
    date: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  };
}
/**
 * Perform full onboarding process:
 * 1. Add Employee
 * 2. Assign Asset (if selected)
 * 3. Create Helpdesk Ticket for setup
 */
function apiOnboardEmployee(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30s lock for complex operation
    
    // 1. Add Employee
    const empData = payload.employee;
    empData.id = 'EMP-' + Date.now();
    empData.status = 'Active';
    const empRes = addRow('Employees', empData);
    if (!empRes.success) throw new Error("Gagal menambahkan karyawan: " + empRes.message);
    
    const newEmpId = empRes.data.id;
    const newEmpName = empRes.data.name;

    // 2. Assign Asset (if any)
    let assetName = '';
    if (payload.assetId) {
      const assignRes = assignAssetToEmployee(newEmpId, payload.assetId);
      if (!assignRes.success) {
        console.warn("Assign asset failed but continuing onboarding: " + assignRes.message);
      } else {
        // Fetch asset name for the ticket
        const assets = getData('Inventory');
        const asset = assets.find(a => a.id == payload.assetId);
        if (asset) assetName = `${asset.brand} ${asset.model} (${asset.serial})`;
      }
    }

    // 3. Create Helpdesk Ticket (IT Helpdesk System)
    const swText = payload.software && payload.software.length > 0 
      ? "\n\nSoftware Checklist:\n- " + payload.software.join("\n- ")
      : "";
    
    const subject = `[ONBOARDING] Persiapan Setup Laptop - ${newEmpName}`;
    const description = `Mohon siapkan laptop untuk karyawan baru: ${newEmpName} (${empData.role}).${swText}`;
      
    const helpdeskData = {
      reporterName: newEmpName,
      location: empData.company,
      category: 'Hardware',
      priority: 'High',
      subject: subject,
      description: description,
      impactLevel: 'Layanan Terganggu',
      source: 'Internal System'
    };
    
    apiAddHelpdeskTicket(helpdeskData);

    // 4. Create General Support Ticket (Ticket Support System - System A)
    const supportTicketData = {
      ticketDate: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      reporterId: newEmpId,
      reporterName: newEmpName,
      issueCategory: 'Setup / Onboarding',
      priority: 'High',
      subject: subject,
      description: description,
      assetId: payload.assetId || '',
      assetName: assetName,
      status: 'Open',
      resolution: ''
    };
    
    apiAddTicket(supportTicketData);
    
    return { 
      success: true, 
      employeeId: newEmpId
    };
    
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}
