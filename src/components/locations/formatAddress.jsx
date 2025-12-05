/**
 * Format a location's address for display
 * 
 * @param {Object} location - Location object with address fields
 * @param {Object} options - Formatting options
 * @param {boolean} options.multiline - Return as array of lines instead of single string
 * @param {boolean} options.includeCountry - Include country in output
 * @param {boolean} options.forPublic - If true, respects is_home_based privacy setting
 * @returns {string|string[]} Formatted address
 */
export function formatAddress(location, options = {}) {
  if (!location) return options.multiline ? [] : '';
  
  const { multiline = false, includeCountry = false, forPublic = false } = options;
  
  // Check if we should hide the street address (home-based business, public display)
  const hideStreet = forPublic && location.is_home_based;
  
  // Build address lines
  const lines = [];
  
  // Line 1: Street address (skip if home-based and public display)
  if (!hideStreet) {
    if (location.street_address) {
      let line1 = location.street_address;
      if (location.address_line2) {
        line1 += `, ${location.address_line2}`;
      }
      lines.push(line1);
    } else if (location.address) {
      // Fallback to legacy address field
      lines.push(location.address);
    }
  }
  
  // Line 2: City, State ZIP (for home-based, just City, State)
  const cityStateZip = [];
  if (location.city) {
    let cityPart = location.city;
    if (location.state) {
      cityPart += `, ${location.state}`;
    }
    cityStateZip.push(cityPart);
  }
  // Only include ZIP if not hiding for home-based
  if (location.zip_code && !hideStreet) {
    cityStateZip.push(location.zip_code);
  }
  if (cityStateZip.length > 0) {
    lines.push(cityStateZip.join(' '));
  }
  
  // Line 3: Country (optional)
  if (includeCountry && location.country && location.country !== 'United States') {
    lines.push(location.country);
  }
  
  if (multiline) {
    return lines;
  }
  
  return lines.join(', ');
}

/**
 * Build a Google Maps search query from location address
 * @param {Object} location - Location object
 * @returns {string} URL-encoded address for Google Maps
 */
export function buildMapsQuery(location) {
  if (!location) return '';
  
  const parts = [];
  
  if (location.street_address) {
    parts.push(location.street_address);
  } else if (location.address) {
    parts.push(location.address);
  }
  
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);
  if (location.zip_code) parts.push(location.zip_code);
  
  return encodeURIComponent(parts.join(', '));
}

/**
 * Get a short display version of address (just city, state)
 * @param {Object} location - Location object
 * @returns {string} Short address
 */
export function formatShortAddress(location) {
  if (!location) return '';
  
  const parts = [];
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);
  
  return parts.join(', ');
}