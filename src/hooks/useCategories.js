/**
 * Single interface for category data (DEC-055).
 * Consume this hook everywhere; Phase 2 migrates all components to it.
 * Later, this hook can switch to PlatformConfig/API without changing consumers.
 */

import {
  mainCategories,
  getMainCategory,
  getSubcategory,
  getLabel,
  getSubcategoryLabel,
  getAllSubcategories,
  getCategoriesByNetwork,
  defaultPopularCategoryIds,
  legacyCategoryMapping,
} from '../components/categories/categoryData';

export function useCategories() {
  return {
    mainCategories,
    getMainCategory,
    getSubcategory,
    getLabel,
    getSubcategoryLabel,
    getAllSubcategories: getAllSubcategories(),
    getCategoriesByNetwork,
    defaultPopularCategoryIds,
    legacyCategoryMapping,
  };
}
