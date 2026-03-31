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
function calculateCostAnalysis(year) {
  const inventory = getData('Inventory');
  const selectedYear = year || new Date().getFullYear();
  let analysis = {};

  inventory.forEach(item => {
    if (String(item.type).toLowerCase() === 'sewa') {
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
