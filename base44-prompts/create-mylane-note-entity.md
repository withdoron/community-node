# Create Entity: MylaneNote

Please create a new entity called **MylaneNote** with the following configuration.

## Entity Name

**MylaneNote**

## Description

Stores personal reminders, tasks, and notes created by users through their Mylane companion. Each record belongs to one user and represents something they asked Mylane to remember, a task they need to complete, or a general note. These notes surface in the user's Home feed and can be marked as done or dismissed.

## Fields

Create the following fields on the MylaneNote entity. Each field must be created exactly as specified.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| user_id | Text | Yes | The user ID of the person who created this note. Used to scope notes so each user sees only their own. Stored as text because Base44 user IDs are in string format. |
| content | Text | Yes | The reminder or note text. Examples: "Call April about Recess flyers" or "Pick up jerseys before Tuesday practice." This is what the user asked Mylane to remember. |
| note_type | Text | Yes | The type of note. Expected values: "reminder" (time-sensitive, has a due date), "task" (action item without urgency), or "note" (general information to remember). Determines how the note displays in the Home feed. |
| due_date | Text | No | Optional target date for the reminder, stored as a text string in YYYY-MM-DD format. If set, the note gets urgency treatment in the Home feed as the date approaches. Not required — many notes are undated ("remember to ask Coach Rick about jerseys"). |
| source_space | Text | No | Which workspace context the note came from, if any. Expected values: "team", "field-service", "finance", "property-pulse", "general". Defaults to "general" for cross-cutting reminders. Used for visual grouping in the feed. |
| status | Text | Yes | The current state of the note. Expected values: "active" (shows in Home feed), "done" (completed by user, hidden from feed), "dismissed" (user chose to remove without completing, hidden from feed). Active notes surface in the feed. Done and dismissed notes are preserved in the database but not displayed. |
| created_by_agent | Text | No | Which AI agent created this note. Expected value is "MyLane" for most cases. In the future, space agents (PlaymakerAgent, FieldServiceAgent, etc.) may also create notes. This field tracks the source for analytics and debugging. |

Note: The **created_date** field is automatically added by Base44 as a DateTime field on every entity. It does not need to be manually created. It will be used for sorting notes newest-first in the Home feed.

## Permissions

Set the following permissions for each CRUD operation on the MylaneNote entity:

| Operation | Permission Level | Reason |
|-----------|-----------------|--------|
| **Create** | Authenticated Users | Any logged-in user can create notes, either through the MyLane agent or through a future direct UI input. |
| **Read** | Creator Only | Users see only their own notes. Notes are personal and private. No other user, coach, or admin can see someone else's notes. |
| **Update** | Creator Only | Only the person who created the note can mark it as done, dismissed, or edit the content. |
| **Delete** | Creator Only | Only the creator can permanently delete their own notes. |

## Confirmation

After creating the entity, please confirm what was created by listing:
- Entity name
- Each field with its name and type
- Each permission level (Create, Read, Update, Delete)
