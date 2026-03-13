import React from 'react';
import { X } from 'lucide-react';

/**
 * Full-screen lightbox for receipt images/PDFs.
 * Click backdrop or X button to close.
 */
export default function FinanceReceiptPreview({ url, onClose }) {
  if (!url) return null;

  const receiptUrl = typeof url === 'object' && url?.url ? url.url : (url || '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Receipt preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors z-10"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <div
        className="max-w-lg max-h-[80vh] w-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {receiptUrl.toLowerCase().endsWith('.pdf') ? (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:text-amber-400 underline text-lg"
          >
            Open PDF Receipt
          </a>
        ) : (
          <img
            src={receiptUrl}
            alt="Receipt"
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
