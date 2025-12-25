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

const ARCHETYPE_DEFINITIONS = {
  venue: { name: 'Location / Venue', description: 'I have a physical space for customers to visit.' },
  location: { name: 'Location / Venue', description: 'I have a physical space for customers to visit.' },
  service: { name: 'Service Provider', description: 'I offer mobile services or professional skills.' },
  talent: { name: 'Service Provider', description: 'I offer mobile services or professional skills.' },
  product: { name: 'Product Seller', description: 'I sell physical or digital products.' },
  community: { name: 'Community / Non-Profit', description: 'I lead a group, cause, church, or congregation.' },
  organizer: { name: 'Event Organizer', description: 'I host pop-ups, festivals, markets, or meetups.' }
};

export async function migrateCategories() {
  console.log('🚀 Starting category migration...');

  try {
    // Step 1: Create Archetypes
    const archetypeMap = {};
    for (const [slug, definition] of Object.entries(ARCHETYPE_DEFINITIONS)) {
      const archetype = await base44.entities.Archetype.create({
        slug,
        name: definition.name,
        description: definition.description
      });
      archetypeMap[slug] = archetype.id;
      console.log(`✅ Created Archetype: ${slug} (${archetype.id})`);
    }

    // Step 2: Create CategoryGroups and SubCategories
    for (const [archetypeSlug, categoryGroups] of Object.entries(ARCHETYPE_CATEGORIES)) {
      const archetypeId = archetypeMap[archetypeSlug];
      if (!archetypeId) {
        console.warn(`⚠️ Skipping unknown archetype: ${archetypeSlug}`);
        continue;
      }

      for (const group of categoryGroups) {
        // Create CategoryGroup
        const categoryGroup = await base44.entities.CategoryGroup.create({
          archetype_id: archetypeId,
          label: group.label
        });
        console.log(`  ✅ Created CategoryGroup: ${group.label} (${categoryGroup.id})`);

        // Create SubCategories
        for (const subCat of group.subCategories) {
          const subCategory = await base44.entities.SubCategory.create({
            group_id: categoryGroup.id,
            name: subCat.name,
            keywords: subCat.keywords || []
          });
          console.log(`    ✅ Created SubCategory: ${subCat.name} (${subCategory.id})`);
        }
      }
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