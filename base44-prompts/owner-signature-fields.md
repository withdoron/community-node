# Base44 Entity Updates: Owner Signature Fields

> PRE-REQUISITE: Run this in the Base44 dashboard before using the owner signing feature.

## FSDocument — New Fields

Add these fields to the existing FSDocument entity. Do NOT change existing fields or permissions:

| Field | Type | Description |
|-------|------|-------------|
| owner_signature_data | text | JSON string with owner's signature details |
| owner_signed_at | text | ISO datetime when owner signed |

## FSEstimate — New Fields

Add these fields to the existing FSEstimate entity. Do NOT change existing fields or permissions:

| Field | Type | Description |
|-------|------|-------------|
| owner_signature_data | text | JSON string with owner's signature details |
| owner_signed_at | text | ISO datetime when owner signed |

## Notes

- `owner_signature_data` stores a JSON string with: `signer_name`, `signer_email`, `signature_image` (base64), `signature_type`, `signed_at`, `consent_text`, `document_hash`
- This is the same structure as the existing `signature_data` field (client signature)
- Both fields use `text` type (not `object`) — the client-side code JSON.stringifies before saving
- Owner signing does NOT change document/estimate status — a document can have an owner signature while still being a draft
