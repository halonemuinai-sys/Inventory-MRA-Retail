/**
 * MASTERDATA.GS
 * Master Data Management
 * 
 * Handles operations for Master_Data and Config sheets.
 */

/**
 * Add master data entry
 */
function apiAddMasterData(category, value) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Master_Data');
  if(!sheet) { setupDatabase(); sheet = ss.getSheetByName('Master_Data'); }
  
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == category && String(data[i][1]).toLowerCase() == String(value).toLowerCase()) {
      return { success: false, message: "Data sudah ada!" };
    }
  }
  sheet.appendRow([category, value]);
  return { success: true };
}

/**
 * Delete master data entry
 */
function apiDeleteMasterData(category, value) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Master_Data');
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] == category && String(data[i][1]) == String(value)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Data tidak ditemukan" };
}

/**
 * Save configuration value
 */
function apiSaveConfig(key, value) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Config');
  if(!sheet) { setupDatabase(); sheet = ss.getSheetByName('Config'); }
  const data = sheet.getDataRange().getValues();
  let found = false;
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == key) {
      sheet.getRange(i+1, 2).setValue(value);
      found = true;
      break;
    }
  }
  if(!found) sheet.appendRow([key, value]);
  return { success: true };
}
