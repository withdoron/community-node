import React, { useMemo } from 'react';
import { rootItems, folderItems } from '@/config/folderTree';
import { predicates as folderPredicates } from '@/config/folderPredicates';
import Tile from '@/components/ui/Tile';
import BreadcrumbPath from '@/components/ui/BreadcrumbPath';

/**
 * TilesCockpit — Phase 4.2-tiles-3.
 *
 * The third cockpit variant alongside the spinner and compass cockpits.
 * Renders folder navigation as a grid of <Tile> primitives plus a
 * <BreadcrumbPath> at the top when descended. The composition is the point —
 * this file is small because tiles-1 (Tile) and tiles-2 (BreadcrumbPath)
 * already exist as primitives.
 *
 * Three rendering modes (driven by external state, not internal):
 *   - At root, no leaf selected: tile grid only (root folders). Breadcrumb
 *     hidden — silence-by-default per Section 8.1.
 *   - Descended into a folder, no leaf selected: breadcrumb shows
 *     [Home → Folder]; tile grid shows that folder's children.
 *   - Leaf selected: breadcrumb shows [Home → Folder → Leaf]; tile grid is
 *     hidden (workspace renders externally, in MyLaneSurface's renderContent).
 *
 * Design context: see Spec-Repo/PHASE-4-MIGRATION-PLAN.md Section 8.13
 * ("Tile cockpit design pivot") and Section 8.16 (this build's notes).
 *
 * Props:
 *   state              { currentUser, profiles, ownedBusinesses } — the same
 *                      shape MyLaneSurface passes to buildSpinnerItems.
 *                      Predicates filter folder visibility from this.
 *   descendedFolderId  string | null — current descent state. Null at root.
 *   tileLeafSelected   boolean — true when a leaf has been tapped (workspace
 *                      renders below; tile grid hides).
 *   currentLeaf        { id, label } | null — the selected leaf when
 *                      tileLeafSelected is true. Used for the third
 *                      breadcrumb segment.
 *   onDescendFolder    (folderId: string) => void — fired when a folder tile
 *                      is tapped. MyLaneSurface decides what to do (descend,
 *                      open overlay, enter switcher) — keeps the
 *                      directory/events/businesses special cases out of here.
 *   onSelectLeaf       (leaf, index) => void — fired when a leaf tile is
 *                      tapped. MyLaneSurface handles the workspace render.
 *   onAscend           (targetId: 'home' | folderId) => void — fired on
 *                      breadcrumb segment tap.
 */

// Folder-tile accent palette — hardcoded for v1. Picked from the same
// border-l-{color}-700 family as the Directory category accents
// (BusinessCard.jsx) so the visual story stays one family. Only colors not
// already used by category accents (amber/teal/violet/sky/rose) get reused —
// gray, purple, blue are net-new for folder tiles.
//
// Flag (Section 8.13): if a fourth/fifth folder lands and this hardcode
// becomes a stone, move accents into folderTree.js as a per-entry field.
const FOLDER_ACCENTS = {
  directory: 'border-l-gray-700',
  events: 'border-l-purple-700',
  personal: 'border-l-teal-700',
  businesses: 'border-l-amber-700',
  discover: 'border-l-blue-700',
  'dev-lab': 'border-l-muted-foreground',
};

const DEFAULT_LEAF_ACCENT = 'border-l-muted-foreground';

function accentFor(item) {
  if (!item) return DEFAULT_LEAF_ACCENT;
  return FOLDER_ACCENTS[item.id] || DEFAULT_LEAF_ACCENT;
}

// Resolve the human-readable label for a folder id from the static folder
// tree at the root level. Used to build breadcrumb segments.
function folderLabelFor(folderId, state) {
  const items = rootItems(state, folderPredicates);
  const match = items.find((i) => i.id === folderId);
  return match?.label || folderId;
}

export default function TilesCockpit({
  state,
  descendedFolderId,
  tileLeafSelected,
  currentLeaf,
  onDescendFolder,
  onSelectLeaf,
  onAscend,
}) {
  // Tile grid items for the current level — root or descended folder
  const items = useMemo(() => {
    if (descendedFolderId) return folderItems(descendedFolderId, state, folderPredicates);
    return rootItems(state, folderPredicates);
  }, [descendedFolderId, state]);

  // Breadcrumb segments — built fresh on each render. The current segment
  // is always the last one; earlier segments carry onClick callbacks that
  // ascend to that level.
  const segments = useMemo(() => {
    if (!descendedFolderId && !tileLeafSelected) return [];
    const segs = [{ id: 'home', label: 'Home', onClick: () => onAscend('home') }];
    if (descendedFolderId) {
      const folderLabel = folderLabelFor(descendedFolderId, state);
      // If a leaf is also selected, the folder segment is interactive (taps
      // ascend back to the folder's tile grid). If we're at the folder
      // browsing level, the folder is the current location (non-interactive).
      if (tileLeafSelected && currentLeaf) {
        segs.push({
          id: descendedFolderId,
          label: folderLabel,
          onClick: () => onAscend(descendedFolderId),
        });
        segs.push({
          id: `leaf:${currentLeaf.id}`,
          label: currentLeaf.label,
        });
      } else {
        segs.push({ id: descendedFolderId, label: folderLabel });
      }
    }
    return segs;
  }, [descendedFolderId, tileLeafSelected, currentLeaf, state, onAscend]);

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb — only when descended or leaf-selected. Silence-by-default
          at root (Section 8.1). */}
      {segments.length > 0 && (
        <BreadcrumbPath segments={segments} mode="primary" />
      )}

      {/* Tile grid — hidden when a leaf is selected (workspace renders
          externally below this component). */}
      {!tileLeafSelected && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full"
          style={{ padding: '8px var(--ll-content-pad, 24px)' }}
        >
          {items.map((item, idx) => {
            const isFolder = item.kind === 'folder';
            const onClick = isFolder
              ? () => onDescendFolder(item.id)
              : () => onSelectLeaf(item, idx);
            return (
              <Tile
                key={item.id}
                label={item.label}
                accentClass={accentFor(item)}
                kind={item.kind}
                onClick={onClick}
                className={item.dim ? 'opacity-60' : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
