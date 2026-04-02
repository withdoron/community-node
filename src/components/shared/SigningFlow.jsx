/**
 * SigningFlow — e-signature flow with legal requirements.
 * Wraps SignatureCanvas with consent, signer info, and audit trail.
 *
 * ESIGN Act + UETA compliant:
 * 1. Intent to sign — explicit "Sign Document" action
 * 2. Consent to e-sign — checkbox with legal text
 * 3. Association with record — document hash + timestamp + signer info
 * 4. Record retention — stored as JSON on entity
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Loader2, Check, Shield } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';

const CONSENT_TEXT =
  'I agree to sign this document electronically. I understand this electronic signature has the same legal effect as a handwritten signature under the ESIGN Act and Oregon UETA.';

/**
 * Compute SHA-256 hash of document content (proves document wasn't altered after signing).
 */
async function hashContent(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SignatureDisplay — renders a captured signature with audit info.
 * Used in both contractor preview and client portal.
 */
export function SignatureDisplay({ signatureData, darkMode = false }) {
  if (!signatureData) return null;
  const sig = typeof signatureData === 'string' ? JSON.parse(signatureData) : signatureData;
  if (!sig?.signature_image) return null;

  const signedDate = sig.signed_at
    ? new Date(sig.signed_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : '';

  return (
    <div className={`rounded-lg p-4 mt-4 ${darkMode ? 'bg-secondary/50 border border-border' : 'border border-border bg-slate-50'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className={`h-4 w-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <span className={`text-xs font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
          Electronically Signed
        </span>
      </div>
      <img
        src={sig.signature_image}
        alt={`Signature of ${sig.signer_name}`}
        className="max-h-20 max-w-[300px] object-contain mb-2"
      />
      <p className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-primary-foreground'}`}>
        {sig.signer_name}
      </p>
      {signedDate && (
        <p className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
          Signed on {signedDate}
        </p>
      )}
    </div>
  );
}

/**
 * SigningFlow — full signing experience.
 * @param {string} documentContent — the plain text content being signed
 * @param {string} documentTitle — title shown to signer
 * @param {string} signerName — pre-filled name (from client data)
 * @param {string} signerEmail — pre-filled email
 * @param {function} onSign — callback with signature_data JSON object
 * @param {boolean} isSaving — disable button while saving
 * @param {boolean} darkMode — theme
 */
export default function SigningFlow({
  documentContent = '',
  documentTitle = 'Document',
  signerName = '',
  signerEmail = '',
  onSign,
  isSaving = false,
  darkMode = false,
}) {
  const [name, setName] = useState(signerName);
  const [email, setEmail] = useState(signerEmail);
  const [consent, setConsent] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [signatureType, setSignatureType] = useState('drawn');
  const [signed, setSigned] = useState(false);

  const canSign = consent && signatureImage && name.trim() && email.trim();

  const handleSignatureChange = useCallback((img, type) => {
    setSignatureImage(img);
    setSignatureType(type);
  }, []);

  const handleSign = async () => {
    if (!canSign) return;

    // Compute document hash BEFORE adding signature
    const docHash = await hashContent(documentContent);

    const signatureData = {
      signer_name: name.trim(),
      signer_email: email.trim(),
      signature_image: signatureImage,
      signature_type: signatureType,
      signed_at: new Date().toISOString(),
      consent_text: CONSENT_TEXT,
      consent_given: true,
      document_hash: docHash,
      ip_address: null, // Browser-side IP capture is unreliable
    };

    onSign?.(signatureData);
    setSigned(true);
  };

  if (signed) {
    return (
      <div className={`rounded-xl p-8 text-center ${darkMode ? 'bg-card border border-border' : 'bg-emerald-50 border border-emerald-200'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
          <Check className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
        </div>
        <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-foreground' : 'text-primary-foreground'}`}>
          Document Signed Successfully
        </h3>
        <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
          A signed copy has been saved. You may close this page.
        </p>
      </div>
    );
  }

  const inputClass = darkMode
    ? 'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]'
    : 'w-full bg-white border border-border text-primary-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]';

  return (
    <div className="space-y-6">
      <div className={`rounded-xl p-5 ${darkMode ? 'bg-card border border-border' : 'border border-border'}`}>
        <h3 className={`text-base font-semibold mb-4 ${darkMode ? 'text-foreground' : 'text-primary-foreground'}`}>
          Sign: {documentTitle}
        </h3>

        {/* Signer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-foreground-soft' : 'text-slate-700'}`}>
              Full Name
            </label>
            <input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-foreground-soft' : 'text-slate-700'}`}>
              Email
            </label>
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
        </div>

        <div className="mb-1">
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-foreground-soft' : 'text-slate-700'}`}>
            Date
          </label>
          <div className={`${inputClass} flex items-center cursor-default ${darkMode ? 'bg-secondary/60' : 'bg-slate-50'}`}>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Signature Capture */}
      <div className={`rounded-xl p-5 ${darkMode ? 'bg-card border border-border' : 'border border-border'}`}>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-foreground-soft' : 'text-slate-700'}`}>
          Your Signature
        </label>
        <SignatureCanvas onChange={handleSignatureChange} signerName={name} darkMode={darkMode} />
      </div>

      {/* Consent */}
      <div className={`rounded-xl p-5 ${darkMode ? 'bg-card border border-border' : 'border border-border'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setConsent(!consent)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                consent
                  ? 'bg-primary border-primary'
                  : darkMode ? 'border-border bg-transparent' : 'border-border bg-transparent'
              }`}
            >
              {consent && <Check className="h-3 w-3 text-primary-foreground" />}
            </button>
          </div>
          <span className={`text-sm ${darkMode ? 'text-foreground-soft' : 'text-slate-700'}`}>
            {CONSENT_TEXT}
          </span>
        </label>
      </div>

      {/* Sign Button */}
      <button
        type="button"
        onClick={handleSign}
        disabled={!canSign || isSaving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-base min-h-[52px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
        ) : (
          <><Shield className="h-5 w-5" /> Sign Document</>
        )}
      </button>

      <p className={`text-xs text-center ${darkMode ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
        By clicking "Sign Document" you are applying your electronic signature to this document.
        This action is legally binding under the ESIGN Act and Oregon UETA.
      </p>
    </div>
  );
}
