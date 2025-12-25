import { base44 } from '@/api/base44Client';

/**
 * Hard Reset: Delete ALL category data from the database
 * Deletes in order: SubCategory -> CategoryGroup -> Archetype (respects FK constraints)
 */

export async function resetAllCategories() {
  console.log('🔥 Starting hard reset of all category data...');

  try {
    // Step 1: Delete all SubCategories
    const allSubs = await base44.entities.SubCategory.list();
    console.log(`Found ${allSubs.length} SubCategories to delete`);
    for (const sub of allSubs) {
      await base44.entities.SubCategory.delete(sub.id);
    }
    console.log('✅ Deleted all SubCategories');

    // Step 2: Delete all CategoryGroups
    const allGroups = await base44.entities.CategoryGroup.list();
    console.log(`Found ${allGroups.length} CategoryGroups to delete`);
    for (const group of allGroups) {
      await base44.entities.CategoryGroup.delete(group.id);
    }
    console.log('✅ Deleted all CategoryGroups');

    // Step 3: Delete all Archetypes
    const allArchetypes = await base44.entities.Archetype.list();
    console.log(`Found ${allArchetypes.length} Archetypes to delete`);
    for (const archetype of allArchetypes) {
      await base44.entities.Archetype.delete(archetype.id);
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