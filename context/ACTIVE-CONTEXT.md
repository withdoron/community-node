# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-11 (Frequency Station B1-B2 + payload debug chain)

## Current Focus

Frequency Station three-section library is functional. 17 songs in Doron's library. Favorites and queue work end-to-end from all contexts (Explore, My Songs). Payload-first debugging principle established (DEC-145).

## Active Architecture

- **Frequency Station:** Phase 3 complete. Three-section My Library. Single-owner hook pattern (DEC-145). SongRow shared component. Pip-Boy radio (DEC-142), Studio + Library (DEC-143), RLS (DEC-144).
- **Frequency hooks:** Single owner in FrequencyStation.jsx, passed as props to MyLibrary. `useFrequencyFavorites` + `useFrequencyQueue`. All payloads String()-typed. track_ids sent as real arrays.
- **Payload-first rule (DEC-145):** When Base44 ops fail, log payload and compare to schema BEFORE theorizing about React state/closures.

## What Just Shipped (2026-04-11)

1. **Prompt A:** Lock-screen fix, delivery guard, dead code (515 lines), mood_tag/artist_id
2. **B1:** Single-page wizard with drafts, tab rename/reorder, per-user station default
3. **B1.5:** Bulk upload (17 songs imported)
4. **B2:** Three-section library, SongRow, favorites, queue, heart + queue buttons everywhere
5. **Debug chain:** SongRow useNavigate → single-owner hooks → queue track_ids string→array (422) → favorites String() defaults

## Known Issues

1. **FrequencyLibraryContext refactor** — prop drilling for favorites/queue should become a context provider
2. **EditSeedForm uses old field set** — legacy fields only
3. **AdminUploadForm + SongCard dead code** — defined but not rendered
4. **Bulk upload no cover art** — jsmediatags incompatible with Base44 deployment

## Upcoming Priorities

1. FrequencyLibraryContext refactor
2. Newsletter "The Good News"
3. Responsive polish pass
