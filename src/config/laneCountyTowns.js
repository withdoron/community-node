// Lane County, Oregon — curated list of towns and notable communities a
// business might declare service coverage for. Includes incorporated cities
// AND notable unincorporated communities (per Build E spec: "Notable
// unincorporated communities... belong in the list — they're real places
// people live and businesses serve.").
//
// Round 1 (Build E, 2026-04-24): hardcoded list. Round 6 (region foundation,
// DEC-172) promotes towns to first-class entities. The data shape on Business
// — an array of slug identifiers — is forward-compatible with that move.
//
// region_slug is set on every entry so when Region becomes a first-class
// entity (DEC-172) the field carries the FK seamlessly.

export const LANE_COUNTY_TOWNS = [
  { slug: 'coburg', display_name: 'Coburg', region_slug: 'lane-county' },
  { slug: 'cottage-grove', display_name: 'Cottage Grove', region_slug: 'lane-county' },
  { slug: 'creswell', display_name: 'Creswell', region_slug: 'lane-county' },
  { slug: 'dexter', display_name: 'Dexter', region_slug: 'lane-county' },
  { slug: 'dunes-city', display_name: 'Dunes City', region_slug: 'lane-county' },
  { slug: 'elmira', display_name: 'Elmira', region_slug: 'lane-county' },
  { slug: 'eugene', display_name: 'Eugene', region_slug: 'lane-county' },
  { slug: 'fall-creek', display_name: 'Fall Creek', region_slug: 'lane-county' },
  { slug: 'florence', display_name: 'Florence', region_slug: 'lane-county' },
  { slug: 'junction-city', display_name: 'Junction City', region_slug: 'lane-county' },
  { slug: 'lowell', display_name: 'Lowell', region_slug: 'lane-county' },
  { slug: 'marcola', display_name: 'Marcola', region_slug: 'lane-county' },
  { slug: 'mckenzie-bridge', display_name: 'McKenzie Bridge', region_slug: 'lane-county' },
  { slug: 'noti', display_name: 'Noti', region_slug: 'lane-county' },
  { slug: 'oakridge', display_name: 'Oakridge', region_slug: 'lane-county' },
  { slug: 'pleasant-hill', display_name: 'Pleasant Hill', region_slug: 'lane-county' },
  { slug: 'springfield', display_name: 'Springfield', region_slug: 'lane-county' },
  { slug: 'veneta', display_name: 'Veneta', region_slug: 'lane-county' },
  { slug: 'vida', display_name: 'Vida', region_slug: 'lane-county' },
  { slug: 'walterville', display_name: 'Walterville', region_slug: 'lane-county' },
  { slug: 'westfir', display_name: 'Westfir', region_slug: 'lane-county' },
];

const BY_SLUG = LANE_COUNTY_TOWNS.reduce((acc, town) => {
  acc[town.slug] = town;
  return acc;
}, {});

export function getTownDisplayName(slug) {
  return BY_SLUG[slug]?.display_name || slug;
}

export function isKnownTownSlug(slug) {
  return Boolean(BY_SLUG[slug]);
}
