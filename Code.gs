/**
 * CODE.GS (MAIN)
 * Routing & Entry Points
 * 
 * SISTEM MANAJEMEN INVENTORI & ANALISIS BIAYA (Versi Produksi)
 * ID Spreadsheet: 1T3xOurx5tgGpWK4EtK_9Y7hRkj-wshZL9gMF0KvQWwc
 * 
 * MODULAR STRUCTURE:
 * - Config.gs: Configuration constants
 * - Database.gs: Core CRUD operations & schema management
 * - MasterData.gs: Master data & config handlers
 * - BusinessLogic.gs: Business rules & calculations
 * - API.gs: Frontend API wrappers
 * - Code.gs: Routing & web app entry point (this file)
 */

function doGet(e) {
  var page = e.parameter.page;
  if (page == 'gis') {
    return HtmlService.createTemplateFromFile('Map').evaluate()
      .setTitle('Luxury Inventory GIS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  
  var template = HtmlService.createTemplateFromFile('index');
  template.include = include; // Explicitly pass the function to the template
  return template.evaluate()
    .setTitle('Inventory & Cost Analysis System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Include HTML partials
 * Used for modular HTML structure
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}