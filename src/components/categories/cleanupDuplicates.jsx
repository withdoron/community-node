import { base44 } from '@/api/base44Client';

/**
 * Cleanup Script: Remove duplicate Archetypes, CategoryGroups, and SubCategories
 * Keeps the first record and deletes the rest for each unique slug/name.
 */

export async function cleanupDuplicateArchetypes() {
  console.log('🧹 Starting Archetype deduplication...');

  try {
    const allArchetypes = await base44.entities.Archetype.list();
    console.log(`Found ${allArchetypes.length} total Archetypes`);

    // Group by slug
    const groupedBySlug = {};
    allArchetypes.forEach(archetype => {
      if (!groupedBySlug[archetype.slug]) {
        groupedBySlug[archetype.slug] = [];
      }
      groupedBySlug[archetype.slug].push(archetype);
    });

    let deletedCount = 0;

    // Delete duplicates (keep first, delete rest)
    for (const [slug, archetypes] of Object.entries(groupedBySlug)) {
      if (archetypes.length > 1) {
        console.log(`⚠️ Found ${archetypes.length} duplicates for slug: ${slug}`);
        
        // Keep the first, delete the rest
        const toDelete = archetypes.slice(1);
        for (const duplicate of toDelete) {
          await base44.entities.Archetype.delete(duplicate.id);
          console.log(`  ❌ Deleted duplicate: ${duplicate.id}`);
          deletedCount++;
        }
      }
    }

    console.log(`✅ Deduplication complete! Deleted ${deletedCount} duplicates.`);
    return { 
      success: true, 
      message: `Removed ${deletedCount} duplicate Archetype(s)`,
      deletedCount
    };
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error: error.message };
  }
}

export async function cleanupDuplicateCategoryGroups() {
  console.log('🧹 Starting CategoryGroup deduplication...');

  try {
    const allGroups = await base44.entities.CategoryGroup.list();
    console.log(`Found ${allGroups.length} total CategoryGroups`);

    // Group by archetype_id + label
    const groupedByKey = {};
    allGroups.forEach(group => {
      const key = `${group.archetype_id}-${group.label}`;
      if (!groupedByKey[key]) {
        groupedByKey[key] = [];
      }
      groupedByKey[key].push(group);
    });

    let deletedCount = 0;

    for (const [key, groups] of Object.entries(groupedByKey)) {
      if (groups.length > 1) {
        console.log(`⚠️ Found ${groups.length} duplicates for: ${key}`);
        
        const toDelete = groups.slice(1);
        for (const duplicate of toDelete) {
          await base44.entities.CategoryGroup.delete(duplicate.id);
          console.log(`  ❌ Deleted duplicate: ${duplicate.id}`);
          deletedCount++;
        }
      }
    }

    console.log(`✅ Deduplication complete! Deleted ${deletedCount} duplicates.`);
    return { 
      success: true, 
      message: `Removed ${deletedCount} duplicate CategoryGroup(s)`,
      deletedCount
    };
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error: error.message };
  }
}

export async function cleanupDuplicateSubCategories() {
  console.log('🧹 Starting SubCategory deduplication...');

  try {
    const allSubs = await base44.entities.SubCategory.list();
    console.log(`Found ${allSubs.length} total SubCategories`);

    // Group by group_id + name
    const groupedByKey = {};
    allSubs.forEach(sub => {
      const key = `${sub.group_id}-${sub.name}`;
      if (!groupedByKey[key]) {
        groupedByKey[key] = [];
      }
      groupedByKey[key].push(sub);
    });

    let deletedCount = 0;

    for (const [key, subs] of Object.entries(groupedByKey)) {
      if (subs.length > 1) {
        console.log(`⚠️ Found ${subs.length} duplicates for: ${key}`);
        
        const toDelete = subs.slice(1);
        for (const duplicate of toDelete) {
          await base44.entities.SubCategory.delete(duplicate.id);
          console.log(`  ❌ Deleted duplicate: ${duplicate.id}`);
          deletedCount++;
        }
      }
    }

    console.log(`✅ Deduplication complete! Deleted ${deletedCount} duplicates.`);
    return { 
      success: true, 
      message: `Removed ${deletedCount} duplicate SubCategory(s)`,
      deletedCount
    };
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error: error.message };
  }
}

export async function cleanupAllDuplicates() {
  const results = {
    archetypes: await cleanupDuplicateArchetypes(),
    categoryGroups: await cleanupDuplicateCategoryGroups(),
    subCategories: await cleanupDuplicateSubCategories()
  };

  const totalDeleted = 
    (results.archetypes.deletedCount || 0) +
    (results.categoryGroups.deletedCount || 0) +
    (results.subCategories.deletedCount || 0);

  if (results.archetypes.success && results.categoryGroups.success && results.subCategories.success) {
    return {
      success: true,
      message: `Cleanup complete! Removed ${totalDeleted} total duplicate(s)`,
      results
    };
  } else {
    return {
      success: false,
      message: 'Some cleanup operations failed',
      results
    };
  }
}