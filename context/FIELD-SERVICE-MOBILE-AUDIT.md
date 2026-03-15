# Field Service Mobile Responsiveness Audit

> Viewport: 375px (iPhone SE / small Android)
> Date: 2026-03-15
> Scope: All 12 FS components + BusinessDashboard tab bar
> Mode: READ-ONLY audit — no component files modified

---

## P0 — Critical (horizontal overflow / unusable at 375px)

### 1. FieldServiceReport.jsx — Material & Labor Tables
**Lines:** ~244-303
**Issue:** Material and labor summary tables have NO `overflow-x-auto` wrapper. At 375px, columns (Description, Qty, Unit, Unit Cost, Total) will overflow the viewport horizontally, causing page-wide horizontal scroll.
**Fix:** Wrap each `<table>` in `<div className="overflow-x-auto">`.

### 2. BusinessDashboard.jsx — Field Service Tab Bar
**Issue:** 5 workspace tabs (Home, Projects, Estimates, Permits, Settings) at ~100px each = ~500px needed. Only 351px available at 375px (minus padding). Tabs will overflow or wrap awkwardly.
**Fix:** Add `overflow-x-auto` with `flex-nowrap` and optional scroll indicators, or collapse to icon-only on small screens.

### 3. FieldServiceEstimates.jsx — Line Items Table
**Issue:** Estimate preview/edit tables have 5+ columns (Description, Qty, Unit, Unit Cost, Total + actions). Will overflow at 375px with no horizontal scroll wrapper.
**Fix:** Wrap tables in `overflow-x-auto` container or switch to stacked card layout on mobile.

---

## P1 — Major (cramped but functional)

### 4. FieldServiceHome.jsx — Stats Grid
**Line:** ~125
**Issue:** `grid-cols-2` stats cards get ~155px each at 375px (375 - 48px padding / 2). Content fits but is tight. Numbers with currency formatting may truncate.
**Fix:** Consider `grid-cols-1` below 400px, or verify all stat values fit at minimum width.

### 5. FieldServiceLog.jsx — Date/Day Grid
**Line:** ~362
**Issue:** `grid-cols-2` for date picker and day number inputs = ~160px per input. Functional but cramped with labels.
**Fix:** Stack to `grid-cols-1` on `sm:` breakpoint.

### 6. FieldServiceLog.jsx — Materials Grid
**Line:** ~525
**Issue:** `grid-cols-3` for material inputs (Material, Qty, Cost) = ~118px per input. Very tight for number inputs with labels.
**Fix:** Use `grid-cols-1 sm:grid-cols-3` for mobile stacking.

### 7. FieldServicePayments.jsx — Summary Cards
**Line:** ~127
**Issue:** `grid-cols-3` summary cards (Total Paid, Pending, Balance) = ~112px per card. Currency values may overflow card boundaries.
**Fix:** Use `grid-cols-1 sm:grid-cols-3` or `grid-cols-2` with third card full-width.

---

## P2 — Minor (cosmetic / low impact)

### 8. FieldServicePhotoGallery.jsx — Photo Grid
**Issue:** `grid-cols-2 sm:grid-cols-3` is fine at 375px (~163px per photo). Acceptable.
**Status:** OK — no change needed.

### 9. FieldServiceLog.jsx — Weather Chips
**Issue:** Weather condition chips in a flex-wrap container. At 375px, may wrap to 3 rows. Functional but takes vertical space.
**Status:** Acceptable — flex-wrap handles it gracefully.

### 10. FieldServiceSettings.jsx — Color Picker
**Issue:** Brand color input + preview swatch in a row. Tight but functional at 375px.
**Status:** OK — minor cosmetic concern only.

### 11. FieldServicePermits.jsx — Form Grid
**Issue:** Some permit form fields use `grid-cols-2`. At 375px, inputs are ~155px each. Functional for text inputs.
**Status:** Acceptable — standard form pattern.

### 12. FieldServiceProjects.jsx — Search Bar + Filters
**Issue:** Search input + status filter dropdown in a flex row. May need to stack on very small screens.
**Status:** Acceptable — flex-wrap likely handles it.

### 13. FieldServiceEstimates.jsx — Client Info Grid
**Issue:** Client name, email, phone in grid layout. Standard form — acceptable at 375px.
**Status:** OK.

### 14. FieldServiceClientPortal.jsx — Payment Summary
**Issue:** `grid-cols-1 md:grid-cols-2` is already mobile-responsive. Good pattern.
**Status:** OK — well implemented.

### 15. FieldServiceReport.jsx — Header Layout
**Issue:** Business logo + name left, contact info right at `flex justify-between`. At 375px, text may crowd. Functional.
**Status:** Acceptable.

---

## Touch Target Compliance (min 44px)

| Component | Status | Notes |
|-----------|--------|-------|
| FieldServiceHome.jsx | PASS | Action buttons have adequate height |
| FieldServiceProjects.jsx | PASS | `min-h-[44px]` on key buttons |
| FieldServiceEstimates.jsx | PASS | Buttons have padding for touch |
| FieldServiceLog.jsx | WARN | Some inline icon buttons (delete material row) may be under 44px |
| FieldServicePayments.jsx | PASS | Standard button sizing |
| FieldServicePermits.jsx | PASS | Standard button sizing |
| FieldServiceSettings.jsx | PASS | Standard form inputs |
| FieldServicePhotoGallery.jsx | PASS | Photo tiles are large touch targets |
| FieldServiceReport.jsx | PASS | Minimal interaction in report view |
| FieldServiceClientPortal.jsx | PASS | `min-h-[44px]` on toolbar buttons |

---

## Summary

| Priority | Count | Action Required |
|----------|-------|----------------|
| P0 Critical | 3 | Must fix before demo — horizontal overflow breaks layout |
| P1 Major | 4 | Should fix — cramped but usable |
| P2 Minor | 8 | Nice to have — cosmetic only |

**Recommended fix order:** P0 items first (report tables, tab bar, estimate tables), then P1 grid breakpoints. P2 items can wait for a dedicated mobile polish pass.
