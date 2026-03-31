/**
 * GIS CONTROLLER
 * Handles data retrieval for the GIS Map
 */

function getStoreData() {
  const locations = getData('DataGIS');
  const inventory = getData('Inventory')
    .filter(item => (item.status || '').toLowerCase() === 'assigned') // Case-insensitive status
    .map(item => ({...item, source: 'Inventory'}));
  const otherDevices = getData('OtherDevices').map(item => ({...item, source: 'OtherDevices'}));
  
  // Merge arrays for counting
  const allAssets = [...inventory, ...otherDevices];
  
  locations.forEach(loc => {
    // Reset counts
    loc.pc_laptop = 0;
    loc.printer = 0; 
    loc.cctv = 0;
    loc.nvr = 0;
    loc.jml_network = 0;
    loc.network_desc = loc.network_desc || '-';

    // Fallback support if using old column name 'nama' locally, but DataGIS uses 'location'
    const locName = loc.location || loc.nama || loc.name;
    
    if (!locName) return;

    // Filter from merged list
    const assets = allAssets.filter(i => {
        const itemLoc = (i.location || i.Location || i.gisLocation || i.GisLocation || '').trim().toLowerCase();
        const targetLoc = locName.trim().toLowerCase();
        
        // Includes Check (Loose Matching)
        // e.g. "Bvlgari Plaza Indonesia" matches "Bvlgari Plaza Indonesia (Lantai 2)"
        // OR target matches item (reversed)
        return itemLoc.includes(targetLoc) || targetLoc.includes(itemLoc);
    });
    
    if(assets.length > 0) {
        const counts = calculateAssetCounts(assets);
        loc.pc_laptop = counts.pc_laptop;
        loc.cctv = counts.cctv;
        loc.nvr = counts.nvr;
        loc.printer = counts.printer;
        loc.jml_network = counts.jml_network;
        loc.network_desc = counts.network_desc;
    }
  });
  
  return locations;
}

function getGISLocationNames() {
  const data = getData('DataGIS');
  return data.map(d => ({ 
      name: d.location || d.nama || d.name || d.Location || d.Nama || "Unknown Location", 
      brand: d.brand || d.Brand || "" 
  })).filter(d => d.name !== "Unknown Location");
}

/**
 * SEED DATA (RUN ONCE)
 * Populates the DataGIS sheet with initial location data provided by user.
 */
function seedGISData() {
  const locations = [
    { name: "Bvlgari Plaza Indonesia", lat: -6.1953047, lng: 106.820125, brand: "Bvlgari" },
    { name: "Bvlgari Plaza Senayan", lat: -6.2255747, lng: 106.797960, brand: "Bvlgari" },
    { name: "Bvlgari Resort Bali", lat: -8.845274, lng: 115.114175, brand: "Bvlgari" },
    { name: "Omega Plaza Indonesia", lat: -6.1951000, lng: 106.820500, brand: "Omega" },
    { name: "Omega Plaza Senayan", lat: -6.2253000, lng: 106.798200, brand: "Omega" },
    { name: "Omega Mall Kelapa Gading", lat: -6.1578000, lng: 106.908300, brand: "Omega" },
    { name: "Omega Tunjungan Plaza Sby", lat: -7.2612747, lng: 112.739700, brand: "Omega" }
  ];

  locations.forEach(loc => {
    addRow('DataGIS', {
      location: loc.name,
      brand: loc.brand,
      lat: loc.lat,
      lng: loc.lng,
      koneksi: 'Online',
      pc_laptop: 0,
      jml_network: 0,
       network_desc: '-',
      cctv: 0,
      nvr: 0,
      printer: 0,
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600&auto=format&fit=crop"
    });
  });
  
  Logger.log("GIS Data Seeded Successfully.");
}

function debugGISData() {
  const data = getStoreData();
  return data.map(d => ({
    name: d.location || d.nama || d.name,
    pc: d.pc_laptop,
    other: (d.jml_network || 0) + (d.cctv || 0) + (d.nvr || 0) + (d.printer || 0)
  }));
}