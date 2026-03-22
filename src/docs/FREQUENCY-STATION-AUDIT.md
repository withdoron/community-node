# FREQUENCY STATION AUDIT RESULTS

> Audit date: 2026-03-22
> Auditor: Mycelia (Claude Code)
> Scope: Full inventory of what's built, wired, and missing against FREQUENCY-STATION-SPEC.md (DEC-084)
> Purpose: Know exactly what we're working with so the next prompt wires everything up efficiently

---

## Summary Dashboard

| Metric | Value |
|--------|-------|
| Spec phases defined | 5 |
| Phases complete | Phase 1 (partial — submission + queue) |
| Phases not started | Phase 2 (song publishing), Phase 3 (share links), Phase 4 (notifications), Phase 5 (audio) |
| Total files | 1 (FrequencyStation.jsx — 763 lines, everything inline) |
| Server functions | 0 |
| Entities referenced in code | 1 of 4 (FSFrequencySubmission only) |
| Entities created in Base44 | 3 confirmed (FSFrequencySubmission, FSFrequencyFavorite, FSFrequencyPlaylist) |
| End-to-end flow working | Submit ✅ → Queue ✅ → Transform ❌ → Publish ❌ → Listen ❌ |
| Closeness to functional | ~35% — submission pipeline works, but no way to create or play songs |

---

## Audit 1: Component Inventory

### Single file — everything lives here:
**File:** `src/pages/FrequencyStation.jsx` (763 lines)

| Component | Lines | What It Renders | Functional? |
|-----------|-------|-----------------|-------------|
| `THEMES` config | 31-38 | 6 elemental theme options (fire/water/earth/air/storm/custom) | ✅ Config only |
| `STATUS_CONFIG` | 42-47 | 4 status states (submitted/in_progress/released/archived) | ✅ Config only |
| `ThemePill` | 50-61 | Colored pill with icon for theme display | ✅ Fully working |
| `StatusBadge` | 64-72 | Colored status label | ✅ Fully working |
| `ListenTab` | 75-87 | **PLACEHOLDER** — static "No songs yet" empty state | ❌ No data, no player |
| `SubmitTab` | 90-266 | Full submission form with text, theme, anonymous, dedication, title | ✅ Creates FSFrequencySubmission records |
| `EditSeedForm` | 270-384 | Inline edit form for user's own submissions | ✅ Updates FSFrequencySubmission |
| `MySeedsTab` | 387-502 | User's submissions with edit/withdraw | ✅ Queries by user_id, allows edit + delete |
| `QueueTab` | 506-675 | Admin queue with filters, mark seen, start processing, archive | ✅ Reads all, updates status |
| `FrequencyStation` (main) | 689-763 | Page shell with tab bar, admin detection, unseen count badge | ✅ Working |

### No sub-components, hooks, configs, or server functions exist for Frequency Station.

### What's NOT built (no component exists):
- Audio player component
- Song card component
- Song detail/page component
- Song creation/publishing form (admin)
- Share link page
- Favorites UI
- Playlist UI

---

## Audit 2: Entity Check

### FSFrequencySubmission — ✅ REFERENCED AND WIRED
**Entity name in code:** `base44.entities.FSFrequencySubmission`

| Operation | Where | Line | Working? |
|-----------|-------|------|----------|
| `.create()` | SubmitTab | 112 | ✅ Creates records |
| `.update()` | EditSeedForm | 281 | ✅ User edits |
| `.update()` | QueueTab | 517 | ✅ Admin status changes |
| `.delete()` | MySeedsTab | 398 | ✅ User withdrawal |
| `.filter({ user_id }).list()` | MySeedsTab | 393 | ✅ User's seeds |
| `.filter({ admin_seen: false }).list()` | Layout.jsx | 45 | ✅ Unseen badge count |
| `.filter({ admin_seen: false }).list()` | FrequencyStation | 706 | ✅ Unseen badge count (page level) |
| `.list()` | QueueTab | 512 | ✅ All submissions for admin |

**Fields used in code:**
- `user_id` — always stored (even anonymous — **PRIVACY VIOLATION**, see Security section)
- `raw_text` — the submission text (sanitized with DOMPurify ✅)
- `theme` — elemental theme (fire/water/earth/air/storm/custom)
- `custom_theme` — free text when theme is 'custom'
- `is_anonymous` — boolean toggle
- `dedication` — optional dedication text
- `title_suggestion` — optional title idea
- `status` — submitted / in_progress / released / archived
- `admin_seen` — boolean for new submission badge
- `created_date` — auto timestamp

**Spec field differences:**
| Spec Field | Code Field | Notes |
|------------|------------|-------|
| `text` | `raw_text` | Different name, same purpose |
| `title` | `title_suggestion` | Semantic difference — spec says "title", code says "suggestion" |
| `mood_tag` (happy/heavy/angry/hopeful/confused/grateful/defiant/other) | `theme` (fire/water/earth/air/storm/custom) | **Completely different taxonomy** — elemental vs emotional |
| `display_name` | Not stored | Missing — no way to credit named submitters |
| `status` enum: new/in_progress/transformed/published/flagged/deleted | submitted/in_progress/released/archived | Different values — "released" vs "published", no "transformed" or "flagged" |

### FrequencySong — ❌ NOT REFERENCED ANYWHERE IN CODE
- Zero imports, zero queries, zero references
- Entity may or may not exist in Base44 — not referenced in codebase
- This is the critical missing piece: no song entity = no Listen tab, no publishing, no library

### FSFrequencyFavorite — ❌ NOT REFERENCED IN CODE
- Entity confirmed created in Base44 per ACTIVE-CONTEXT.md
- Zero code references — not wired to any UI

### FSFrequencyPlaylist — ❌ NOT REFERENCED IN CODE
- Entity confirmed created in Base44 per ACTIVE-CONTEXT.md
- Zero code references — not wired to any UI

---

## Audit 3: End-to-End Flow Check

### 1. Submit → ✅ WORKING
- User writes text on Submit tab → creates FSFrequencySubmission record ✅
- Anonymous toggle working ✅ (but see privacy issue below)
- Theme selection stored ✅
- Dedication stored ✅
- Title suggestion stored ✅
- XSS sanitized via sanitizeText() ✅
- Auth gate: shows "Sign in to submit" for unauthenticated users ✅
- After submit: switches user to My Seeds tab ✅
- Cache invalidation: my-seeds, queue, unseen-count ✅

### 2. Queue (Admin) → ✅ WORKING (Read/Triage)
- Shows all submissions (`.list()` — full table scan, no pagination) ✅
- Filter by status (all/submitted/in_progress/released/archived) ✅
- Counts per status filter ✅
- New submission highlight (amber border when `!admin_seen`) ✅
- Mark as seen ✅
- Start processing (status → in_progress) ✅
- Archive (status → archived) ✅
- Auto-refresh every 30 seconds ✅
- **Missing:** No "mark as released/published" action — can only go to in_progress or archived
- **Missing:** No way to link submission to a song
- **Missing:** No flag for inappropriate content

### 3. Song Publishing → ❌ NOT BUILT
- No FrequencySong entity referenced in code
- No admin form to create a song record
- No way to upload audio
- No way to set title, lyrics, credit line, slug
- No way to link a song to submission(s)
- **This entire phase is missing**

### 4. Listen → ❌ PLACEHOLDER ONLY
- ListenTab (lines 75-87) renders a static empty state: "No songs yet"
- No query to any song entity
- No audio player
- No song cards
- No filtering, sorting, or search
- **The tab exists visually but does nothing**

### 5. My Seeds → ✅ WORKING
- Shows user's submissions sorted by date ✅
- Status badge per seed ✅
- Theme pill ✅
- Title suggestion and dedication displayed ✅
- Edit button (only when status is 'submitted') ✅
- Withdraw/delete button (only when status is 'submitted') ✅
- Inline edit form with full field editing ✅
- **Missing:** No indication if a seed became a song (no song linkage exists)
- **Missing:** No "Released as song" state shows link to the song

### 6. Share Links → ❌ NOT BUILT
- No `/frequency/:slug` route in App.jsx
- No Open Graph meta tags
- No song detail page
- No share button/copy link functionality

---

## Audit 4: Audio Support

| Feature | Status | Details |
|---------|--------|---------|
| Audio formats expected | ❌ Not defined | No audio code exists |
| HTML5 audio player | ❌ Not built | No `<audio>` element anywhere |
| Base44 file upload for audio | ❌ Not wired | No UploadFile integration |
| Max audio file size | ❌ Not defined | No validation |
| Waveform visualization | ❌ Not built | No canvas/SVG audio viz |
| Basic play/pause | ❌ Not built | Nothing |

**Audio is entirely Phase 5 of the spec. Zero audio code exists.**

---

## Audit 5: Security & Permissions

### ⚠️ CRITICAL — Anonymous submissions store user_id
**File:** `src/pages/FrequencyStation.jsx`, line 102
```javascript
const payload = {
  user_id: user.id,  // ALWAYS stored, even when isAnonymous is true
  ...
  is_anonymous: isAnonymous,
};
```

**Spec says (line 132):** "Anonymous submissions have no connection to the submitter's identity — not in the database, not in admin view. Once submitted anonymously, even the admin cannot trace it back. (Implementation: don't store user_id for anonymous submissions.)"

**Current behavior:** user_id is ALWAYS stored regardless of anonymous toggle. The anonymous flag only controls display, not data storage. An admin with Base44 dashboard access can trace any "anonymous" submission back to its author.

**Fix needed:** When `isAnonymous === true`, set `user_id: null` in the payload.

**Impact on My Seeds tab:** If user_id is null for anonymous seeds, the My Seeds query (`filter({ user_id: user.id })`) won't return them. Need a secondary identifier (e.g., store a `session_token` or accept that anonymous seeds don't appear in My Seeds).

### Queue tab admin gate — ✅ PROPERLY GATED
- Line 699: `const isAdmin = currentUser?.role === 'admin'`
- Line 700: Queue tab only appears in tab list for admins
- Line 760: `{activeTab === 'queue' && isAdmin && <QueueTab />}` — double gate
- However: QueueTab itself doesn't check admin internally — relies on parent gate

### Route protection — ✅ CORRECT
- `/frequency` route is NOT wrapped in ProtectedRoute (App.jsx line 191-198)
- This is correct: Listen tab should be publicly browsable
- Submit tab handles its own auth gate (line 141-148): shows "Sign in" message

### Published songs accessibility — N/A (no songs exist)
- When built, FrequencySong should have public read for status='published'

### XSS — ✅ SANITIZED (as of security fix)
- `sanitizeText()` imported and applied to: raw_text, custom_theme, dedication, title_suggestion (lines 103-108)

### Missing consent checkbox
- **Spec says:** "I understand my words will be transformed, not published as-is" consent checkbox
- **Code:** No consent checkbox exists. User can submit without acknowledging transformation.

---

## Audit 6: Gap Analysis

### ✅ Working End-to-End
1. **Submit form** — text, theme, anonymous toggle, dedication, title suggestion → creates FSFrequencySubmission record
2. **My Seeds** — view, edit, withdraw own submissions
3. **Queue** — admin views all, marks seen, starts processing, archives
4. **Unseen badge** — Layout.jsx Community dropdown shows count for admin
5. **XSS sanitization** — all text fields sanitized before storage
6. **Tab navigation** — 3 tabs for users, 4 for admin, with count badge on Queue

### 🔌 Built But Not Wired
1. **ListenTab component** — exists but renders static placeholder, no data connection
2. **"released" status** — defined in STATUS_CONFIG but no admin action transitions to it
3. **FSFrequencyFavorite entity** — created in Base44 but zero code references
4. **FSFrequencyPlaylist entity** — created in Base44 but zero code references

### ❌ Not Built Yet
1. **FrequencySong entity** — not referenced anywhere in code (may not exist in Base44)
2. **Song creation form** — admin can't create song records from submissions
3. **Audio upload** — no file upload for MP3/WAV
4. **Audio player** — no `<audio>` element, no play/pause UI
5. **Song cards** — no component to display a song in the library
6. **Song detail page** — no `/frequency/:slug` route
7. **Listen tab data** — no query to song entity, no filtering/sorting
8. **Share links** — no Open Graph meta, no copy-to-clipboard
9. **Download** — no audio file download
10. **Notifications** — no submitter notification when seed becomes song
11. **Featured song** — no admin toggle, no featured display
12. **Related songs** — no mood/theme matching
13. **Search** — no library search
14. **Listen/share count tracking** — no increment logic
15. **Consent checkbox** — spec requires it, not built
16. **Display name field** — spec has it for non-anonymous credits, not built
17. **Slug generation** — no URL slug logic for songs
18. **Cover image** — no album art upload/display

### 🔧 To Make Frequency Station Minimally Functional (MVP Path)

The minimum path for: Doron submits a test seed → transforms it in Suno → uploads audio → it plays on the Listen tab:

1. **Fix anonymous privacy** — set `user_id: null` when `isAnonymous === true` (line 102)
2. **Create FrequencySong entity in Base44** (if not already created) with fields: title, slug, lyrics, style_genre, mood_tag, audio_url, credit_line, submission_ids, listen_count, share_count, is_featured, status, published_at
3. **Add "Mark as Released" action in QueueTab** — transitions submission to 'released' status
4. **Build admin song creation form** — either in QueueTab or as a separate admin section:
   - Title, lyrics, style/genre
   - Audio file upload (Base44 Core.UploadFile)
   - Credit line (auto-generated from submission anonymous status)
   - Link to submission(s) that inspired it
   - Status: draft → published
   - Auto-generate slug from title
5. **Build song card component** — displays title, theme pill, credit line, play button
6. **Build basic audio player** — HTML5 `<audio>` with play/pause/progress bar in amber
7. **Wire ListenTab to query FrequencySong** — filter by status='published', sort by published_at desc
8. **Add `/frequency/:slug` route** — song detail page with full lyrics, player, share button
9. **Add share button** — copy link to clipboard

Steps 1-7 make it functional. Steps 8-9 make it shareable.

---

## Audit 7: Spec Compliance Table

| Spec Feature | Spec Phase | Built? | Working? | Notes |
|-------------|-----------|--------|----------|-------|
| Submit form (text, theme, anonymous, dedication) | Build 1 | ✅ | ✅ | Theme taxonomy differs from spec (elemental vs emotional) |
| Title field on submission | Build 1 | ✅ | ✅ | Called "title_suggestion" not "title" |
| Consent checkbox | Build 1 | ❌ | — | Spec requires "I understand my words will be transformed" |
| Display name for non-anonymous | Build 1 | ❌ | — | No display_name field stored |
| Anonymous architecture (no user_id) | Build 1 | ⚠️ | ⚠️ | **user_id always stored — violates spec privacy rule** |
| Admin queue | Build 1 | ✅ | ✅ | View, filter, mark seen, process, archive |
| Status lifecycle (new→in_progress→transformed→published) | Build 1 | ⚠️ | ⚠️ | Uses submitted/in_progress/released/archived — no "transformed" step, no way to reach "released" |
| Flag inappropriate content | Build 1 | ❌ | — | No flag action exists |
| FrequencySong entity | Build 2 | ❌ | — | Not in codebase at all |
| Admin song creation form | Build 2 | ❌ | — | Not built |
| Song library page (Listen tab) | Build 2 | ⚠️ | ❌ | Tab exists, renders placeholder only |
| Song detail page | Build 2 | ❌ | — | No route, no component |
| Audio player | Build 2/5 | ❌ | — | No audio code exists |
| Slug generation | Build 2 | ❌ | — | No slug logic |
| Listen count tracking | Build 2 | ❌ | — | No increment logic |
| Share links (unique URL per song) | Build 3 | ❌ | — | No `/frequency/:slug` route |
| Open Graph metadata | Build 3 | ❌ | — | No OG tags |
| Copy-to-clipboard share | Build 3 | ❌ | — | No share button |
| Download button | Build 3 | ❌ | — | No download |
| Submit-your-own CTA on song pages | Build 3 | ❌ | — | No song pages exist |
| Notify named submitters | Build 4 | ❌ | — | No notification system |
| Featured song system | Build 4 | ❌ | — | No featured toggle |
| Related songs by mood | Build 4 | ❌ | — | No song matching |
| Search within library | Build 4 | ❌ | — | No search |
| Direct audio upload (WAV/MP3) | Build 5 | ❌ | — | No upload |
| In-page audio player (play/pause/progress) | Build 5 | ❌ | — | No player |
| Favorites | Future | ❌ | — | Entity exists in Base44, zero code |
| Playlists | Future | ❌ | — | Entity exists in Base44, zero code |

---

## Field Name Mapping: Spec vs Implementation

| Concept | Spec Entity/Field | Code Entity/Field | Match? |
|---------|-------------------|-------------------|--------|
| Submission entity | FrequencySubmission | FSFrequencySubmission | ⚠️ Different name (FS prefix) |
| Song entity | FrequencySong | (not referenced) | ❌ Missing |
| Submission text | `text` | `raw_text` | ⚠️ Different |
| Title | `title` | `title_suggestion` | ⚠️ Different semantic |
| Mood/vibe | `mood_tag` (emotional: happy/heavy/angry...) | `theme` (elemental: fire/water/earth...) | ❌ Different taxonomy |
| Anonymous flag | `is_anonymous` | `is_anonymous` | ✅ Match |
| Display name | `display_name` | (not stored) | ❌ Missing |
| Status values | new/in_progress/transformed/published/flagged/deleted | submitted/in_progress/released/archived | ⚠️ Different values |
| Dedication | (not in spec) | `dedication` | ➕ Extra field (good addition) |
| Custom theme | (not in spec) | `custom_theme` | ➕ Extra field |
| Admin seen | (not in spec) | `admin_seen` | ➕ Extra field (good for queue UX) |

---

## Architecture Notes

### Single-File Pattern
Everything (763 lines) is in one file with inline sub-components. This is fine for now but will need splitting when song publishing is added. Recommended extraction:
- `src/components/frequency/SubmitTab.jsx`
- `src/components/frequency/MySeedsTab.jsx`
- `src/components/frequency/QueueTab.jsx`
- `src/components/frequency/ListenTab.jsx` (once built)
- `src/components/frequency/SongCard.jsx` (once built)
- `src/components/frequency/AudioPlayer.jsx` (once built)

### No Server Functions
All operations are client-side Base44 entity CRUD. This is acceptable for Phase 1 but will need a server function for:
- Song publishing (admin creates song from submission — needs asServiceRole for cross-entity linking)
- Listen count incrementing (needs rate limiting to prevent abuse)
- Audio file management

### Query Pattern Note
MySeedsTab uses `.filter({ user_id: user.id }).list()` — this is the client SDK pattern (with `.list()` chain). QueueTab uses `.list()` for all submissions. Both are correct for client SDK per CLAUDE.md.

---

## What's Working Well

1. **Submit flow is polished** — theme pills, anonymous toggle, dedication, title suggestion, loading states, error handling, sanitization, cache invalidation. Production-ready UX.
2. **My Seeds is complete** — edit, withdraw, status display, date sorting. Users can manage their submissions.
3. **Queue admin view is functional** — filters, unseen highlighting, status transitions, auto-refresh. Doron can triage submissions today.
4. **Nav integration is solid** — Community dropdown in Layout.jsx shows unseen count badge. Mobile hamburger includes Frequency Station. Route at `/frequency` works.
5. **Garden language is applied** — "Plant a seed", "Seed planted!", themes as elements. Matches THE-GARDEN.md metaphor.
6. **Gold Standard compliance** — dark theme, amber accent, proper text hierarchy, no violations.

---

## Bottom Line

**Frequency Station is ~35% built.** The submission pipeline (Submit → Queue → My Seeds) works end-to-end and is production-quality. But the song pipeline (Transform → Publish → Listen → Share) doesn't exist at all. The Listen tab is a placeholder. No song entity is referenced in code. No audio capability exists.

**To make it functional, you need Build 2 from the spec.** The minimum viable path is:
1. Fix anonymous privacy (critical)
2. Create/confirm FrequencySong entity
3. Add admin song creation + audio upload
4. Build audio player
5. Wire Listen tab to real data

This is a focused build — maybe 2-3 sessions to get songs playing on the Listen tab.

---

*This audit is read-only. No code was changed. Use these findings to write targeted build prompts for Frequency Station Phase 2.*
