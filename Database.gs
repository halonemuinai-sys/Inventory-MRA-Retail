/**
 * DATABASE.GS
 * Core Database Operations
 * 
 * Handles all direct sheet operations including CRUD operations and schema management.
 */

/**
 * Setup Database: Menjamin struktur sheet lengkap.
 * Jalankan ini sekali untuk inisialisasi/update kolom.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const schemas = {
    'Inventory': ['id', 'company', 'brand', 'model', 'type', 'serial', 'status', 'assignedTo', 'condition', 'rentalCost', 'rentalStart', 'rentalEnd', 'updatedAt', 'processor', 'ram', 'storage', 'os', 'office', 'software', 'rentalRef', 'vendor', 'purchaseDate', 'location', 'deviceCategory', 'purchasePrice'],
    'OtherDevices': ['id', 'company', 'category', 'brand', 'model', 'serial', 'purchaseDate', 'purchasePrice', 'location', 'condition', 'qty', 'updatedAt'],
    'Employees': ['id', 'company', 'name', 'role', 'department', 'email', 'status', 'assignedAssetId', 'joinDate', 'budget'], 
    'Users': ['username', 'password', 'name', 'role'], 
    'Tickets': ['id', 'ticketDate', 'reporterId', 'reporterName', 'issueCategory', 'priority', 'subject', 'description', 'assetId', 'assetName', 'status', 'resolution', 'updatedAt'],
    'HelpdeskTickets': ['id', 'reporterName', 'ticketSource', 'ticketDate', 'ticketTime', 'location', 'category', 'issueTitle', 'description', 'priority', 'status', 'responseDate', 'responseTime', 'resolvedDate', 'resolvedTime', 'slaStatus', 'impactLevel', 'updatedAt'],
    'AssetHistory': ['id', 'assetId', 'action', 'empId', 'empName', 'date', 'notes', 'updatedAt'],
    'Master_Data': ['category', 'value'], 
    'Config': ['key', 'value'],
    'DataGIS': ['id', 'location', 'brand', 'lat', 'lng', 'koneksi', 'pc_laptop', 'jml_network', 'network_desc', 'cctv', 'nvr', 'printer', 'image', 'updatedAt']
  };

  Object.keys(schemas).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      sheet.setFrozenRows(1);
    } else {
      // Handle Header Renames (Migration)
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      if (sheetName === 'DataGIS') {
        const namaIdx = currentHeaders.indexOf('nama');
        const locIdx = currentHeaders.indexOf('location');
        if (namaIdx > -1 && locIdx === -1) {
          sheet.getRange(1, namaIdx + 1).setValue('location');
        }
      }
      
      if (sheetName === 'Inventory') {
        const gisLocIdx = currentHeaders.indexOf('gisLocation');
        const locIdx = currentHeaders.indexOf('location');
        if (gisLocIdx > -1 && locIdx === -1) {
          sheet.getRange(1, gisLocIdx + 1).setValue('location');
        }
      }

      // Re-fetch headers after potential rename
      const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newHeaders = schemas[sheetName];
      const missingHeaders = newHeaders.filter(h => !updatedHeaders.includes(h));
      
      if (missingHeaders.length > 0) {
        sheet.getRange(1, updatedHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      }
    }
  });
}

/**
 * Get data from a sheet
 */
function getData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; 
  
  const headers = data.shift();
  
  return data.map(row => {
    let tempObject = {};
    headers.forEach((key, index) => {
      const val = row[index];
      if(val instanceof Date) {
         try { 
           // If header implies a "Time" field, format as HH:mm
           if (key.toLowerCase().includes('time')) {
             tempObject[key] = Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
           } else {
             // Otherwise assume it's a Date field, format as yyyy-MM-dd
             tempObject[key] = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
           }
         } catch(e) { tempObject[key] = val; }
      } else {
         tempObject[key] = val;
      }
    });
    return tempObject;
  });
}

/**
 * Add a new row to a sheet
 */
function addRow(sheetName, dataObj) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newRow = headers.map(header => {
      if (header === 'id' && !dataObj['id']) return Utilities.getUuid();
      if (header === 'updatedAt') return new Date();
      return dataObj[header] || '';
    });
    
    sheet.appendRow(newRow);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update an existing row in a sheet
 */
function updateRow(sheetName, id, dataObj) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] == id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return { success: false, message: "ID tidak ditemukan" };
    
    Object.keys(dataObj).forEach(key => {
      const colIndex = headers.indexOf(key);
      if (colIndex > -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(dataObj[key]);
      }
    });
    
    const updatedAtIndex = headers.indexOf('updatedAt');
    if(updatedAtIndex > -1) sheet.getRange(rowIndex, updatedAtIndex + 1).setValue(new Date());

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete a row from a sheet
 */
function deleteRow(sheetName, id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const idIndex = data[0].indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] == id) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, message: "ID tidak ditemukan" };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}
