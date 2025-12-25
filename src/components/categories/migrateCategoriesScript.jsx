import { base44 } from '@/api/base44Client';
import { ARCHETYPE_CATEGORIES } from './archetypeCategories';

/**
 * Migration Script: Populate Archetype, CategoryGroup, and SubCategory entities
 * from the hardcoded ARCHETYPE_CATEGORIES object.
 * 
 * Run this once to migrate the data into the database.
 * 
 * Usage: Call `migrateCategories()` from a component or admin page.
 */

// Define unique archetypes (deduplicated by slug)
const UNIQUE_ARCHETYPE_DEFINITIONS = [
  { slug: 'venue', name: 'Location / Venue', description: 'I have a physical space for customers to visit.' },
  { slug: 'service', name: 'Service Provider', description: 'I offer mobile services or professional skills.' },
  { slug: 'product', name: 'Product Seller', description: 'I sell physical or digital products.' },
  { slug: 'community', name: 'Community / Non-Profit', description: 'I lead a group, cause, church, or congregation.' },
  { slug: 'organizer', name: 'Event Organizer', description: 'I host pop-ups, festivals, markets, or meetups.' }
];

// Map legacy slugs to their canonical versions
const SLUG_ALIASES = {
  venue: 'venue',
  location: 'venue',
  service: 'service',
  talent: 'service',
  product: 'product',
  community: 'community',
  organizer: 'organizer'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function migrateCategories() {
  console.log('🚀 Starting category migration...');

  try {
    // Step 1: Create unique Archetypes only
    const createdArchetypes = await base44.entities.Archetype.bulkCreate(UNIQUE_ARCHETYPE_DEFINITIONS);
    
    // Build map using canonical slugs
    const archetypeMap = {};
    createdArchetypes.forEach((archetype) => {
      archetypeMap[archetype.slug] = archetype.id;
      console.log(`✅ Created Archetype: ${archetype.slug} (${archetype.id})`);
    });

    await sleep(500); // Delay between archetype and group creation

    // Step 2: Create CategoryGroups and SubCategories with rate limiting
    for (const [archetypeSlug, categoryGroups] of Object.entries(ARCHETYPE_CATEGORIES)) {
      // Map legacy slug to canonical slug
      const canonicalSlug = SLUG_ALIASES[archetypeSlug];
      const archetypeId = archetypeMap[canonicalSlug];
      
      if (!archetypeId) {
        console.warn(`⚠️ Skipping unknown archetype: ${archetypeSlug}`);
        continue;
      }

      // Batch create category groups for this archetype
      const groupsToCreate = categoryGroups.map(group => ({
        archetype_id: archetypeId,
        label: group.label
      }));

      const createdGroups = await base44.entities.CategoryGroup.bulkCreate(groupsToCreate);
      console.log(`✅ Created ${createdGroups.length} CategoryGroups for ${archetypeSlug}`);

      await sleep(300); // Delay between groups

      // Create subcategories for each group with small delays
      for (let i = 0; i < categoryGroups.length; i++) {
        const group = categoryGroups[i];
        const categoryGroup = createdGroups[i];

        const subCategoriesToCreate = group.subCategories.map(subCat => ({
          group_id: categoryGroup.id,
          name: subCat.name,
          keywords: subCat.keywords || []
        }));

        // Process in smaller batches to avoid rate limiting
        const batchSize = 10;
        for (let j = 0; j < subCategoriesToCreate.length; j += batchSize) {
          const batch = subCategoriesToCreate.slice(j, j + batchSize);
          await base44.entities.SubCategory.bulkCreate(batch);
          console.log(`  ✅ Created ${batch.length} SubCategories for ${group.label}`);
          
          if (j + batchSize < subCategoriesToCreate.length) {
            await sleep(200); // Small delay between batches
          }
        }

        await sleep(200); // Delay between groups
      }

      await sleep(300); // Delay between archetypes
    }

    console.log('🎉 Migration complete!');
    return { success: true, message: 'Categories migrated successfully' };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to get all categories in a hierarchical structure
 */
export async function getCategoriesHierarchy() {
  const archetypes = await base44.entities.Archetype.list();
  const groups = await base44.entities.CategoryGroup.list();
  const subCategories = await base44.entities.SubCategory.list();

  return archetypes.map(archetype => ({
    ...archetype,
    groups: groups
      .filter(g => g.archetype_id === archetype.id)
      .map(group => ({
        ...group,
        subCategories: subCategories.filter(sc => sc.group_id === group.id)
      }))
  }));
}

/**
 * Helper function to find a subcategory by name
 */
export async function findSubCategoryByName(name) {
  const subCategories = await base44.entities.SubCategory.list();
  return subCategories.find(sc => sc.name === name);
}