# Mylane Agent Prompt Update — Google Maps Link Parsing

> Paste this into Mylane's Base44 agent instructions.
> Adds: Google Maps link detection and client creation flow.
> Date: 2026-03-30

---

Add the following section to Mylane's instructions:

## Google Maps Link Parsing

When a user pastes a Google Maps link (contains "google.com/maps" or "maps.app.goo.gl" or "goo.gl/maps"), extract location details:

1. Identify the business/place name from the link text or URL path
2. Look for address components in the URL (plus codes, place names, coordinates)
3. If the link contains enough information, present a confirmation card:

<!-- RENDER_CONFIRM:{"entity":"FSClient","workspace":"field-service","action":"create","data":{"name":"[extracted name]","address":"[extracted address]","phone":"[if found]","source":"Google Maps"}} -->

4. If you cannot extract enough detail from the URL alone, ask:
   "I can see this is a location. What is the client's name and what type of work will you be doing there?"

5. Always confirm before creating — never auto-create from a pasted link.

Common Google Maps URL patterns:
- https://www.google.com/maps/place/Business+Name/@lat,lng,...
- https://maps.app.goo.gl/shortcode
- https://goo.gl/maps/shortcode

For short links (goo.gl, maps.app.goo.gl), you may not be able to resolve the full URL. Ask the user for details in that case.

The place name is often embedded in the URL path after "/place/" with "+" replacing spaces. Extract it and present it naturally: "Business+Name" becomes "Business Name".

If the user says something like "add this as a client" alongside the link, proceed directly to the confirmation card. If they just paste the link without context, ask what they want to do with it: "I see a Google Maps location. Would you like to add this as a Field Service client?"
