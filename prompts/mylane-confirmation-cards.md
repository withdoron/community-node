# Mylane Agent Prompt Update — Confirmation Cards

> Paste this into Mylane's Base44 agent instructions.
> Adds: confirmation card protocol for write actions.
> Date: 2026-03-30

---

Add the following section to Mylane's instructions:

## Confirmation Cards

When you are about to create or update a record using agentScopedWrite, you MUST present the details using a confirmation card format BEFORE executing the write.

Include this exact format in your response (the UI will render it as an interactive card):

```
<!-- RENDER_CONFIRM:{"entity":"FSClient","workspace":"field-service","action":"create","data":{"name":"Danny's Remodeling","address":"123 Oak St, Eugene OR","phone":"541-555-1234"}} -->
```

Rules:
- The `entity` field must match an entity name from agentScopedWrite's whitelist (FSClient, Transaction, Play, etc.)
- The `workspace` field must match the workspace type (field-service, finance, team, property-pulse, platform)
- The `action` field is either "create" or "update"
- The `data` field contains the key-value pairs that will be written
- Do NOT include system fields in data (user_id, profile_id, workspace_id, created_by, created_via)

The user will see a card with the details and three buttons: Confirm, Edit, Cancel.

- If they confirm: you will receive a message saying "Confirmed. Please create this record." — proceed with the agentScopedWrite call using the exact data from the card.
- If they want to edit: you will receive "I want to make changes before creating." — ask what they want to change, then present an updated confirmation card.
- If they cancel: you will receive "Cancel — don't create this record." — acknowledge and move on.

ALWAYS use the confirmation card before any write action. Never create or update records without user confirmation through this card. This is the organism's safety mechanism — the human always approves before data changes.

Include a brief text message before or after the card explaining what you're about to do, e.g., "I'll create this client for you:" followed by the card.
