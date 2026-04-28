import React, { useMemo } from 'react';
import { rootItems, folderItems } from '@/config/folderTree';
import { predicates as folderPredicates } from '@/config/folderPredicates';
import { resolveBusinessSpaces, SPACE_TYPES } from '@/config/spaceTypes';
import { resolveCategoryAccent } from '@/components/business/BusinessCard';
import Tile from '@/components/ui/Tile';
import BreadcrumbPath from '@/components/ui/BreadcrumbPath';

/**
 * TilesCockpit — Phase 4.2-tiles-3 (initial), 4.2-tiles-4 (per-business
 * descent + uniform navigation).
 *
 * Renders folder navigation as a grid of <Tile> primitives plus a
 * <BreadcrumbPath> at the top when descended. Composition over invention —
 * this component reads from folderTree.js + folderPredicates.js +
 * spaceTypes.js + the BusinessCard accent helper, and binds them through
 * <Tile> + <BreadcrumbPath>.
 *
 * Five tile-grid modes (driven by external state, not internal):
 *   1. Root: tile grid of root folders. Breadcrumb hidden.
 *   2. Personal-folder grid: tile grid of Personal's children leaves.
 *      Breadcrumb [Home → Personal].
 *   3. Businesses grid: tile grid of owned businesses (4.2-tiles-4).
 *      Breadcrumb [Home → Businesses].
 *   4. Per-business spaces grid: tile grid of a specific business's
 *      enabled_spaces unioned with the universal Profile + Settings
 *      pair (4.2-tiles-4). Breadcrumb [Home → Businesses → <Business>].
 *   5. Hidden (workspace renders externally): when a leaf is selected
 *      (Personal leaves) or a per-business space is selected, the tile
 *      grid hides — MyLaneSurface's content area renders the workspace
 *      below this component. Breadcrumb stays, with the leaf/space as
 *      its final segment.
 *
 * Directory and Events: when descendedFolderId is 'directory' or 'events',
 * the tile grid hides and the page content is rendered externally by
 * MyLaneSurface (page-content reframe, 4.2-tiles-4). Breadcrumb shows
 * [Home → Directory] or [Home → Events]. The DEC-148 overlay machinery is
 * NOT triggered for tile cockpit users — uniform navigation per Section 8.13.
 *
 * Design context: Spec-Repo/PHASE-4-MIGRATION-PLAN.md Sections 8.13–8.17.
 *
 * Props:
 *   state              { currentUser, profiles, ownedBusinesses } — same
 *                      shape MyLaneSurface uses for predicate filtering.
 *   descendedFolderId  string | null — null at root.
 *   tileLeafSelected   boolean — true when a Personal leaf is selected
 *                      (workspace renders externally).
 *   currentLeaf        { id, label } | null — the Personal leaf when
 *                      tileLeafSelected.
 *   descendedBusinessId  string | null — when descendedFolderId is
 *                        'businesses', this points at the user's chosen
 *                        business. (4.2-tiles-4)
 *   descendedSpaceId   string | null — when descendedBusinessId is set,
 *                      this points at the user's chosen space within that
 *                      business. (4.2-tiles-4) When non-null, tile grid
 *                      hides; the space's content renders externally.
 *   ownedBusinesses    array — passed through from useActiveBusiness, used
 *                      to build the businesses tile grid and to resolve a
 *                      business by id for the breadcrumb segment + spaces
 *                      tile grid.
 *   onDescendFolder    (folderId) => void
 *   onSelectLeaf       (leaf, index) => void — Personal leaf taps.
 *   onSelectBusiness   (business) => void — owned-business tile taps.
 *   onSelectSpace      (spaceMeta) => void — per-business space tile taps.
 *   onAscend           (targetSegmentId) => void — breadcrumb segment taps.
 *                      targetSegmentId is 'home', a folder id, 'businesses',
 *                      or `business:<id>` for the business level.
 */

// Folder-tile accent palette — hardcoded for v1. Picked from the same
// border-l-{color}-700 family as the Directory category accents
// (BusinessCard.jsx) so the visual story stays one family.
//
// Flag (Section 8.13): if a fourth/fifth folder lands and this hardcode
// becomes a stone, move accents into folderTree.js as a per-entry field.
const FOLDER_ACCENTS = {
  directory: 'border-l-gray-700',
  events: 'border-l-purple-700',
  personal: 'border-l-teal-700',
  businesses: 'border-l-amber-700',
  discover: 'border-l-blue-700',
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

// Resolve a business's display name from ownedBusinesses by id.
function businessLabelFor(businessId, ownedBusinesses) {
  const match = ownedBusinesses?.find((b) => b.id === businessId);
  return match?.name || match?.business_name || 'Business';
}

// Resolve a space type's label from the catalog — keeps spaceTypes.js the
// single source of label truth for breadcrumb segments at the space level.
function spaceLabelFor(spaceId) {
  return SPACE_TYPES[spaceId]?.label || spaceId;
}

export default function TilesCockpit({
  state,
  descendedFolderId,
  tileLeafSelected,
  currentLeaf,
  descendedBusinessId,
  descendedSpaceId,
  ownedBusinesses,
  onDescendFolder,
  onSelectLeaf,
  onSelectBusiness,
  onSelectSpace,
  onAscend,
}) {
  // Resolve the descended business record (when applicable) once per render.
  const descendedBusiness = useMemo(() => {
    if (!descendedBusinessId || !ownedBusinesses) return null;
    return ownedBusinesses.find((b) => b.id === descendedBusinessId) || null;
  }, [descendedBusinessId, ownedBusinesses]);

  // ─── Tile grid items — depends on descent depth ─────────────────────
  // Five mutually-exclusive modes; the first matching condition wins.
  const tileGrid = useMemo(() => {
    // Per-business space level — terminal: a space is selected, tile grid
    // hides (caller renders workspace externally).
    if (descendedSpaceId) return null;

    // Per-business spaces grid — show the business's enabled_spaces
    // unioned with the universal Profile + Settings pair.
    if (descendedBusinessId && descendedBusiness) {
      const spaces = resolveBusinessSpaces(descendedBusiness);
      return {
        kind: 'spaces',
        items: spaces.map((sp) => ({
          id: sp.id,
          label: sp.label,
          sublabel: sp.sublabel,
          accentClass: sp.accentClass,
          onClick: () => onSelectSpace(sp),
        })),
      };
    }

    // Businesses grid — owned businesses as Tile primitives, accent
    // resolved via the same category helper Directory uses (DEC-060
    // visual continuity).
    if (descendedFolderId === 'businesses') {
      return {
        kind: 'businesses',
        items: (ownedBusinesses || []).map((b) => ({
          id: b.id,
          label: b.name || b.business_name || 'Business',
          sublabel: b.city
            ? (b.state ? `${b.city}, ${b.state}` : b.city)
            : undefined,
          accentClass: resolveCategoryAccent(b, undefined),
          onClick: () => onSelectBusiness(b),
        })),
      };
    }

    // Directory / Events — tile grid hides; page content renders
    // externally. Caller decides what to show below.
    if (descendedFolderId === 'directory' || descendedFolderId === 'events') {
      return null;
    }

    // Personal-folder leaf selected — workspace renders externally;
    // tile grid hides (existing 4.2-tiles-3 behaviour).
    if (tileLeafSelected) return null;

    // Personal-folder browsing — show the folder's children.
    if (descendedFolderId) {
      const items = folderItems(descendedFolderId, state, folderPredicates);
      return {
        kind: 'folder-children',
        items: items.map((item, idx) => ({
          id: item.id,
          label: item.label,
          accentClass: accentFor(item),
          dim: item.dim,
          onClick: () => onSelectLeaf(item, idx),
        })),
      };
    }

    // Root — top-level folders + leaves filtered by predicates.
    const items = rootItems(state, folderPredicates);
    return {
      kind: 'root',
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        accentClass: accentFor(item),
        dim: item.dim,
        onClick: () => {
          if (item.kind === 'folder') onDescendFolder(item.id);
          else onSelectLeaf(item, items.indexOf(item));
        },
      })),
    };
  }, [
    descendedFolderId,
    descendedBusinessId,
    descendedBusiness,
    descendedSpaceId,
    tileLeafSelected,
    ownedBusinesses,
    state,
    onDescendFolder,
    onSelectLeaf,
    onSelectBusiness,
    onSelectSpace,
  ]);

  // ─── Breadcrumb segments — root → current ───────────────────────────
  // Built fresh on each render. Earlier segments carry onClick callbacks
  // that ascend to that level; the final segment is the current location.
  const segments = useMemo(() => {
    // Silence-by-default at root with no descent (Section 8.1).
    if (
      !descendedFolderId &&
      !tileLeafSelected &&
      !descendedBusinessId &&
      !descendedSpaceId
    ) {
      return [];
    }

    const segs = [{ id: 'home', label: 'Home', onClick: () => onAscend('home') }];

    if (descendedFolderId) {
      const folderLabel = folderLabelFor(descendedFolderId, state);

      // Businesses path: [Home → Businesses → (Business → (Space)?)?]
      if (descendedFolderId === 'businesses') {
        if (descendedBusinessId) {
          // Businesses is now interactive (ascend back to businesses grid).
          segs.push({
            id: 'businesses',
            label: folderLabel,
            onClick: () => onAscend('businesses'),
          });
          const businessLabel = businessLabelFor(descendedBusinessId, ownedBusinesses);
          if (descendedSpaceId) {
            segs.push({
              id: `business:${descendedBusinessId}`,
              label: businessLabel,
              onClick: () => onAscend(`business:${descendedBusinessId}`),
            });
            segs.push({
              id: `space:${descendedSpaceId}`,
              label: spaceLabelFor(descendedSpaceId),
            });
          } else {
            segs.push({
              id: `business:${descendedBusinessId}`,
              label: businessLabel,
            });
          }
        } else {
          // Just at the businesses-grid level.
          segs.push({ id: 'businesses', label: folderLabel });
        }
        return segs;
      }

      // Personal / Directory / Events path
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
  }, [
    descendedFolderId,
    descendedBusinessId,
    descendedSpaceId,
    tileLeafSelected,
    currentLeaf,
    ownedBusinesses,
    state,
    onAscend,
  ]);

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb — only when descended past root. Silence-by-default
          at root (Section 8.1). */}
      {segments.length > 0 && (
        <BreadcrumbPath segments={segments} mode="primary" />
      )}

      {/* Tile grid — hidden when caller renders content externally
          (page reframe for Directory/Events, workspace for any selected
          leaf or per-business space). */}
      {tileGrid && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full"
          style={{ padding: '8px var(--ll-content-pad, 24px)' }}
        >
          {tileGrid.items.map((item) => (
            <Tile
              key={item.id}
              label={item.label}
              sublabel={item.sublabel}
              accentClass={item.accentClass}
              kind={tileGrid.kind}
              onClick={item.onClick}
              className={item.dim ? 'opacity-60' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

