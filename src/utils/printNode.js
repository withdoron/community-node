/**
 * Print a DOM subtree in isolation from the parent document.
 *
 * window.print() called from inside an embedded iframe (e.g. Base44's
 * Act-As-User preview at /apps/{id}/editor/preview) targets the parent
 * document. The parent renders our app as a fixed-height embedded element,
 * so the print pipeline clips anything past that element's height to a
 * single page — no @media print rule inside the inner document can fix it.
 *
 * Pattern: build a fresh HTML document inside a hidden iframe with copies
 * of the parent's stylesheets, then call iframe.contentWindow.print().
 * That print call targets only the inner iframe's document — no parent
 * chrome, no embedded-frame height constraint, full pagination.
 */
export function printNode(node, { title, extraCss = '' } = {}) {
  if (!node || typeof window === 'undefined') return false;

  // Vite ships <link rel="stylesheet"> in prod and inline <style> tags in dev.
  // Copy both so Tailwind + component styles apply in the new document.
  const styleHTML = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((el) => {
      if (el.tagName === 'LINK') {
        return `<link rel="stylesheet" href="${el.href}">`;
      }
      return el.outerHTML;
    })
    .join('\n');

  // Carry the parent's <html> attributes (data-theme, data-cockpit, lang, dir,
  // class) into the print iframe. Without this, theme-scoped CSS variables
  // fall back to :root defaults — which in this codebase resolve to the dark
  // theme via `:root, [data-theme="dark"] { ... }` (index.css). For an
  // unauthenticated estimate PDF rendered against the light theme, the
  // mismatch shifts every semantic token (muted-foreground, border, primary-
  // foreground) to its dark-theme value, faded against the white card background.
  // Copying the attribute restores parity between the on-screen preview and
  // the printed document.
  const parentHtml = document.documentElement;
  const htmlAttrs = Array.from(parentHtml.attributes)
    .map((a) => `${a.name}="${escapeHtml(a.value)}"`)
    .join(' ');

  const html = `<!DOCTYPE html>
<html ${htmlAttrs}>
<head>
  <meta charset="utf-8">
  <base href="${window.location.origin}/">
  <title>${escapeHtml(title || 'Document')}</title>
  ${styleHTML}
  <style>
    @page { margin: 0.5in; size: letter; }
    html, body { background: white !important; margin: 0; padding: 0; }
    /* Force browser to honor background colors and gradients in print output.
       Without this, Chrome/Safari strip card fills (bg-slate-50, etc.) by
       default — which collapses every styled card to plain white, losing
       the visual hierarchy the on-screen preview carries. */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Print-fidelity: muted text variables are calibrated for screen contrast
       against dark/light theme backgrounds. On white paper they translate to
       washed-out gray that loses readability — field labels, metadata, totals
       labels, and footer copy all blur into the page. Override at the variable
       level so every consumer of text-muted-foreground / text-foreground-soft
       picks up a print-readable dark gray automatically (Living Feet — one
       source of truth, every consumer follows). Applied across all theme
       attributes since the iframe inherits the parent's data-theme. */
    :root,
    [data-theme="dark"],
    [data-theme="light"],
    [data-theme="fallout"] {
      --muted-foreground: 220 13% 26%; /* gray-700 ~ #374151 */
      --foreground-soft: 217 19% 27%;  /* slate-700 ~ #334155 */
    }
    .print-avoid-break { page-break-inside: avoid; }
    ${extraCss}
  </style>
</head>
<body>${node.outerHTML}</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  // Set title via JS as well as via <title> tag — in deep-nested iframes
  // (Base44 editor top → app preview iframe → printNode iframe) Chrome's
  // "Save as PDF" filename source is inconsistent. Setting the title via
  // JS after document.close() guarantees it's applied before print fires.
  if (title) doc.title = title;

  // Swap the parent (app) document.title to the target as well. If Chrome's
  // print pipeline reads the host document's title rather than the iframe's
  // for the suggested filename (observed in Base44's nested iframe context),
  // this covers it. Restore on a delay since the print dialog is async.
  const previousParentTitle = document.title;
  if (title) document.title = title;
  const restoreParentTitle = () => {
    if (document.title === title) document.title = previousParentTitle;
  };

  const trigger = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('printNode: print failed', err);
    }
    // Print dialog is async; removing the iframe too early closes the dialog,
    // and restoring the parent title too early changes the filename mid-flight.
    setTimeout(() => {
      iframe.remove();
      restoreParentTitle();
    }, 2000);
  };

  // document.write doesn't reliably fire iframe onload, and <link rel="stylesheet">
  // copies need network. Wait for fonts.ready (proxy for "stylesheets applied")
  // with a hard cap so we don't hang if no fonts are pending.
  const waitAndPrint = () => {
    const fontsReady = doc.fonts ? doc.fonts.ready : Promise.resolve();
    Promise.race([
      fontsReady,
      new Promise((r) => setTimeout(r, 600)),
    ]).then(() => setTimeout(trigger, 50));
  };

  if (doc.readyState === 'complete') {
    waitAndPrint();
  } else {
    iframe.onload = waitAndPrint;
    // Belt-and-suspenders fallback if onload never fires.
    setTimeout(waitAndPrint, 1000);
  }

  return true;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
