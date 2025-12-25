import { base44 } from '@/api/base44Client';

/**
 * Hard Reset: Delete ALL category data from the database
 * Deletes in order: SubCategory -> CategoryGroup -> Archetype (respects FK constraints)
 */

export async function resetAllCategories() {
  console.log('🔥 Starting hard reset of all category data...');

  try {
    // Step 1: Bulk delete all SubCategories
    const allSubs = await base44.entities.SubCategory.list();
    console.log(`Found ${allSubs.length} SubCategories to delete`);
    if (allSubs.length > 0) {
      const subIds = allSubs.map(sub => sub.id);
      // Delete in batches of 50 to avoid overwhelming the API
      for (let i = 0; i < subIds.length; i += 50) {
        const batch = subIds.slice(i, i + 50);
        await Promise.all(batch.map(id => base44.entities.SubCategory.delete(id)));
      }
    }
    console.log('✅ Deleted all SubCategories');

    // Step 2: Bulk delete all CategoryGroups
    const allGroups = await base44.entities.CategoryGroup.list();
    console.log(`Found ${allGroups.length} CategoryGroups to delete`);
    if (allGroups.length > 0) {
      const groupIds = allGroups.map(group => group.id);
      // Delete in batches of 50
      for (let i = 0; i < groupIds.length; i += 50) {
        const batch = groupIds.slice(i, i + 50);
        await Promise.all(batch.map(id => base44.entities.CategoryGroup.delete(id)));
      }
    }
    console.log('✅ Deleted all CategoryGroups');

    // Step 3: Bulk delete all Archetypes
    const allArchetypes = await base44.entities.Archetype.list();
    console.log(`Found ${allArchetypes.length} Archetypes to delete`);
    if (allArchetypes.length > 0) {
      const archetypeIds = allArchetypes.map(archetype => archetype.id);
      // Delete in batches of 50
      for (let i = 0; i < archetypeIds.length; i += 50) {
        const batch = archetypeIds.slice(i, i + 50);
        await Promise.all(batch.map(id => base44.entities.Archetype.delete(id)));
      }
    }
    console.log('✅ Deleted all Archetypes');

    console.log('🎉 Hard reset complete! Database is clean.');
    return { 
      success: true, 
      message: 'Successfully deleted all category data. Ready for fresh migration.'
    };
  } catch (error) {
    console.error('❌ Reset failed:', error);
    return { success: false, error: error.message };
  }
}