# Create Entity: TeamPhoto

Please create a new entity called **TeamPhoto** with the following configuration.

## Entity Name

**TeamPhoto**

## Description

Stores photos uploaded by team members (coaches, parents, players) to a shared team gallery. Each record represents one photo with metadata about who uploaded it, an optional caption, and an optional event type tag.

## Fields

Create the following fields on the TeamPhoto entity. Each field must be created exactly as specified.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| team_id | Text | Yes | Foreign key linking this photo to a specific Team entity record. Every photo belongs to exactly one team. |
| uploaded_by | Text | Yes | The user ID of the person who uploaded this photo. Used to determine who can edit or delete the photo. Stored as text because Base44 user IDs are in string format. |
| uploader_name | Text | Yes | The display name of the person who uploaded this photo. Stored directly on the record so the gallery can show "Uploaded by Sarah" without needing to look up the user's name from a separate table. |
| photo_url | Text | Yes | The URL of the uploaded image file. This URL is returned by the Base44 UploadFile integration when a user uploads a photo. |
| caption | Text | No | An optional text description of the photo. Can be added at upload time or edited later by the person who uploaded it. Example: "Team huddle before the big game" |
| event_type | Text | No | An optional tag categorizing what kind of event the photo is from. Expected values are: "game", "practice", "hangout", or "other". Used for filtering photos in the gallery view. |
| event_date | Text | No | The date of the event the photo is from, stored as a text string. Optional — if not provided, the frontend will fall back to the record's creation date for display purposes. |

Note: The **created_date** field is automatically added by Base44 as a DateTime field on every entity. It does not need to be manually created. It will be used for sorting photos newest-first in the gallery.

## Permissions

Set the following permissions for each CRUD operation on the TeamPhoto entity:

| Operation | Permission Level | Reason |
|-----------|-----------------|--------|
| **Create** | Authenticated Users | Any logged-in user who is a member of the team (coach, parent, or player) can upload photos to the shared gallery. |
| **Read** | Authenticated Users | All logged-in users can view all photos in the gallery. This is a shared team gallery — no photos are private. |
| **Update** | Creator Only | Only the person who originally uploaded the photo can edit its caption or event type tag. Other team members cannot modify someone else's photo. |
| **Delete** | Creator Only | Only the person who originally uploaded the photo can delete it. This prevents accidental or unauthorized removal of other people's photos. |

## Confirmation

After creating the entity, please confirm what was created by listing:
- Entity name
- Each field with its name and type
- Each permission level (Create, Read, Update, Delete)
