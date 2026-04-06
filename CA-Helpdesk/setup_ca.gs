function setupCAData() {
  Logger.log("--- Memulai Setup CA-Helpdesk ---");

  // 1. Coba hubungkan ke Spreadsheet Utama
  let mainSS;
  try {
    mainSS = SpreadsheetApp.openById(MAIN_SHEET_ID);
    Logger.log("✅ Berhasil memuat Spreadsheet Utama (" + MAIN_SHEET_ID + ")");
  } catch (e) {
    throw new Error("❌ GAGAL: Akun Anda tidak memiliki akses ke Spreadsheet Utama (MAIN_SHEET_ID). Pastikan ID benar dan bagikan akses ke akun ini.");
  }

  // 2. Setup sheet 'Employees'
  let employeeSheet = mainSS.getSheetByName('Employees');
  if (!employeeSheet) {
    Logger.log("⚠️ Sheet 'Employees' tidak ditemukan. Membuat sheet baru...");
    employeeSheet = mainSS.insertSheet('Employees');
    employeeSheet.appendRow(['id', 'company', 'name', 'role', 'department', 'email', 'status', 'assignedAssetId', 'joinDate', 'budget', 'location']);
    employeeSheet.setFrozenRows(1);
    Logger.log("✅ Sheet 'Employees' berhasil dibuat.");
  } else {
    // Pastikan kolom 'location' ada
    const headers = employeeSheet.getRange(1, 1, 1, employeeSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('location') === -1) {
      employeeSheet.getRange(1, headers.length + 1).setValue('location');
      Logger.log("✅ Kolom 'location' ditambahkan ke sheet Employees.");
    } else {
      Logger.log("ℹ️ Kolom 'location' sudah tersedia.");
    }
  }

  // 3. Setup sheet 'DataGIS'
  let gisSheet = mainSS.getSheetByName('DataGIS');
  if (!gisSheet) {
    Logger.log("⚠️ Sheet 'DataGIS' tidak ditemukan. Membuat sheet baru...");
    gisSheet = mainSS.insertSheet('DataGIS');
    gisSheet.appendRow(['id', 'location', 'brand', 'lat', 'lng', 'koneksi', 'pc_laptop', 'jml_network', 'network_desc', 'cctv', 'nvr', 'printer', 'image', 'updatedAt']);
    gisSheet.setFrozenRows(1);
    Logger.log("✅ Sheet 'DataGIS' berhasil dibuat.");
  }
  
  // Isi 3 Toko Utama di DataGIS untuk dropdown
  const gisData = gisSheet.getDataRange().getValues();
  const existingStores = gisData.map(row => row[1]);
  const requiredStores = ["Bvlgari Plaza Indonesia", "Bvlgari Plaza Senayan", "Bvlgari Resort Bali"];
  
  requiredStores.forEach(store => {
    if (!existingStores.includes(store)) {
      gisSheet.appendRow([Utilities.getUuid(), store, "Bvlgari", 0, 0, "OK", 0, 0, "", 0, 0, 0, "", new Date()]);
      Logger.log("✅ Menambahkan Toko: " + store);
    }
  });

  // 4. Setup sheet 'HelpdeskTickets' (Untuk sinkronisasi)
  let hdSheet = mainSS.getSheetByName('HelpdeskTickets');
  if (!hdSheet) {
    Logger.log("⚠️ Sheet 'HelpdeskTickets' tidak ditemukan. Membuat sheet baru...");
    hdSheet = mainSS.insertSheet('HelpdeskTickets');
    hdSheet.appendRow(['id', 'reporterName', 'ticketSource', 'ticketDate', 'ticketTime', 'location', 'category', 'issueTitle', 'description', 'priority', 'status', 'responseDate', 'responseTime', 'resolvedDate', 'resolvedTime', 'slaStatus', 'impactLevel', 'updatedAt']);
    hdSheet.setFrozenRows(1);
    Logger.log("✅ Sheet 'HelpdeskTickets' berhasil dibuat.");
  }

  // 5. Setup Spreadsheet CA (System B)
  let caSS;
  try {
    caSS = SpreadsheetApp.openById(CA_SHEET_ID);
    Logger.log("✅ Berhasil memuat Spreadsheet CA (" + CA_SHEET_ID + ")");
  } catch (e) {
    throw new Error("❌ GAGAL: Akun Anda tidak memiliki akses ke Spreadsheet CA (CA_SHEET_ID).");
  }

  let caSheet = caSS.getSheetByName('CA_Tickets');
  const caHeaders = ['id', 'reporterName', 'location', 'date', 'time', 'category', 'title', 'description', 'status', 'updatedAt'];
  
  if (!caSheet) {
    caSheet = caSS.insertSheet('CA_Tickets');
    caSheet.appendRow(caHeaders);
    caSheet.getRange(1, 1, 1, caHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    caSheet.setFrozenRows(1);
    Logger.log("✅ Sheet 'CA_Tickets' berhasil dibuat di Spreadsheet CA.");
  } else {
    Logger.log("ℹ️ Sheet 'CA_Tickets' sudah tersedia.");
  }

  Logger.log("--- Setup Selesai Berhasil! ---");
  return "Setup Berhasil! Semua sheet dan header telah siap. Silakan isi data advisor Anda di Database Utama (sheet Employees).";
}
