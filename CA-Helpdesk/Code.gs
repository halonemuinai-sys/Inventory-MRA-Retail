/**
 * CODE.GS (CA-Helpdesk)
 * Mobile Backend for Client Advisor IT Support
 */

function doGet() {
  return HtmlService.createTemplateFromFile('CA_Index')
    .evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* --- API FUNCTIONS --- */

/**
 * Get Locations (Stores) from Master Data or GIS
 */
function getStores() {
  const ss = SpreadsheetApp.openById(MAIN_SHEET_ID);
  const sheet = ss.getSheetByName('DataGIS');
  if (!sheet) return ["Bvlgari Plaza Indonesia", "Bvlgari Plaza Senayan", "Bvlgari Resort Bali"];
  
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header
  return [...new Set(data.map(row => row[1]))].filter(loc => loc.includes('Bvlgari'));
}

/**
 * Get CAs by Location
 */
function getCAsByLocation(location) {
  const ss = SpreadsheetApp.openById(MAIN_SHEET_ID);
  const sheet = ss.getSheetByName('Employees');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const locIdx = headers.indexOf('location');
  const nameIdx = headers.indexOf('name');
  const roleIdx = headers.indexOf('role');
  
  return data.filter(row => {
    const locMatch = row[locIdx] === location;
    const roleMatch = row[roleIdx] === 'Client Advisor' || row[roleIdx] === 'Store Manager';
    return locMatch && roleMatch;
  }).map(row => ({ name: row[nameIdx] }));
}

/**
 * Submit Ticket from CA
 */
function submitCATicket(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');
    const ticketId = 'CA-' + Date.now();

    const ticketData = {
      id: ticketId,
      reporterName: payload.caName,
      ticketSource: 'Mobile CA',
      ticketDate: dateStr,
      ticketTime: timeStr,
      location: payload.location,
      category: payload.category || 'General',
      issueTitle: payload.title,
      description: payload.description,
      priority: 'Medium',
      status: 'Open',
      updatedAt: now
    };

    // 1. Save to CA-Database (System B)
    const caSS = SpreadsheetApp.openById(CA_SHEET_ID);
    let caSheet = caSS.getSheetByName('CA_Tickets');
    if (!caSheet) {
      caSheet = caSS.insertSheet('CA_Tickets');
      caSheet.appendRow(['id', 'reporterName', 'location', 'date', 'time', 'category', 'title', 'description', 'status', 'updatedAt']);
    }
    caSheet.appendRow([
      ticketData.id, ticketData.reporterName, ticketData.location, 
      ticketData.ticketDate, ticketData.ticketTime, ticketData.category,
      ticketData.issueTitle, ticketData.description, ticketData.status, ticketData.updatedAt
    ]);

    // 2. Push to Main Database (System A)
    const mainSS = SpreadsheetApp.openById(MAIN_SHEET_ID);
    const mainSheet = mainSS.getSheetByName('HelpdeskTickets');
    const mainHeaders = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0];
    
    const newMainRow = mainHeaders.map(h => {
      if (h === 'id') return 'HD-CA-' + Date.now(); // Special ID for CA Source
      return ticketData[h] || '';
    });
    mainSheet.appendRow(newMainRow);

    return { success: true, ticketId: ticketId };
    
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get Ticket History for a specific CA
 */
function getCAHistory(caName) {
  const ss = SpreadsheetApp.openById(CA_SHEET_ID);
  const sheet = ss.getSheetByName('CA_Tickets');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const nameIdx = headers.indexOf('reporterName');
  
  return data.filter(row => row[nameIdx] === caName).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] instanceof Date ? Utilities.formatDate(row[i], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[i];
    });
    return obj;
  }).reverse(); // Latest first
}

function include(filename) {
  const variations = [
    filename,
    'CA-Helpdesk/' + filename,
    filename.replace('CA_', 'CA-Helpdesk/')
  ];
  
  for (let name of variations) {
    try {
      return HtmlService.createHtmlOutputFromFile(name).getContent();
    } catch (e) {
      // try next
    }
  }
  throw new Error("File HTML '" + filename + "' tidak ditemukan di sidebar Google Apps Script.");
}
