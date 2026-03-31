/**
 * GIS_BusinessLogic.gs
 * Contains business logic for GIS calculations.
 */

/**
 * Calculates asset counts for a given list of assets.
 * @param {Array} assets - List of inventory assets for a specific location.
 * @returns {Object} - Object containing counts for pc_laptop, cctv, nvr, printer, jml_network, and network_desc.
 */
function calculateAssetCounts(assets) {
  let counts = {
    pc_laptop: 0,
    cctv: 0,
    nvr: 0,
    printer: 0,
    jml_network: 0,
    network_desc: '-'
  };

  if (!assets || assets.length === 0) return counts;

  assets.forEach(a => {
    const model = (a.model || '').toLowerCase();
    const brand = (a.brand || '').toLowerCase();
    const type = (a.type || '').toLowerCase();
    const category = (a.deviceCategory || a.category || a.Category || '').toLowerCase();
    const source = a.source || '';

    const qty = parseInt(a.qty) || 1; // Default to 1 if not set

    // Priority 1: Explicit Device Category
    if (category === 'camera cctv' || category === 'cctv') {
        counts.cctv += qty;
    } else if (category === 'nvr' || category === 'nvr system') {
        counts.nvr += qty;
    } else if (category === 'printer') {
        counts.printer += qty;
    } else if (category === 'network device' || category === 'network') {
        counts.jml_network += qty;
        if (counts.network_desc === '-') counts.network_desc = a.model;
    } else if (category === 'pc/laptop' || category === 'pc' || category === 'laptop') {
        counts.pc_laptop += qty; // Usually 1 for serialized assets, but safe to add
    } else {
        // Priority 2: Fallback to Keywords (Legacy Support)
        if (model.includes('cctv') || model.includes('camera') || type.includes('camera')) {
            counts.cctv += qty;
        } else if (model.includes('nvr') || model.includes('dvr')) {
            counts.nvr += qty;
        } else if (model.includes('printer') || brand.includes('epson') || brand.includes('canon') || brand.includes('hp laser') || type.includes('printer')) {
            counts.printer += qty;
        } else if (model.includes('switch') || model.includes('router') || model.includes('access point') || brand.includes('cisco') || brand.includes('mikrotik') || brand.includes('ubiquiti') || type.includes('network')) {
            counts.jml_network += qty;
            // Default to PC/Laptop ONLY if source is explicitly 'Inventory'
            // This prevents OtherDevices (or unknown sources) from polluting PC counts.
            if (source === 'Inventory') {
                counts.pc_laptop += qty;
            }
        }
    }
  });

  return counts;
}
