# Flashcards App — Specification

## Data Model

### Folder

- `id`, `name`, `created_at`, `updated_at`
- Folders are flat (no nesting)
- A folder contains zero or more cards

### Card

- `id`, `folder_id`, `type`, `front`, `back`, `created_at`, `updated_at`
- **Types:**
  - **Basic** — text front, text back
  - **Reversible** — like basic, but quizzed in both directions
  - **Cloze** — single text field with `{{cloze}}` deletions; each deletion generates one quiz item
- Scheduling fields (per quiz-facing side):
  - `ease_factor` (float, default 2.5)
  - `interval_days` (int, default 0)
  - `repetitions` (int, default 0)
  - `next_review` (datetime)

## Scheduling Algorithm (SM-2 variant)

After each review the user rates difficulty: **Again (0) · Hard (1) · Good (2) · Easy (3)**.

|Rating|Effect                                                                                  |
|------|----------------------------------------------------------------------------------------|
|Again |Reset `repetitions` to 0, set `interval` to 1 day, reduce `ease_factor` by 0.2 (min 1.3)|
|Hard  |Multiply interval by `1.2`, reduce `ease_factor` by 0.15 (min 1.3)                      |
|Good  |Multiply interval by `ease_factor`                                                      |
|Easy  |Multiply interval by `ease_factor * 1.3`, increase `ease_factor` by 0.15                |

New cards (repetitions == 0): interval starts at 1 day (Again/Hard) or 3 days (Good/Easy).

`next_review = now + interval_days`

## Views

### 1. Quiz View

- Entry point: select a folder (or “All folders”)
- Shows cards where `next_review <= now`, ordered by `next_review` ASC
- Display flow: show front → user reveals back → user rates (Again / Hard / Good / Easy)
- Progress bar: cards remaining in session
- Session ends when no more due cards; show summary (total reviewed, rating distribution)
- Cloze cards highlight the blank; reversible cards appear as two separate quiz items

### 2. Edit View

- **Folder list** sidebar: create, rename, delete folders
  - Deleting a folder deletes all contained cards (confirm dialog)
- **Card list** for selected folder: sortable by created date or next review
- **Card editor** (modal or inline):
  - Create: pick type, fill fields, assign to folder
  - Edit: modify any field (type change allowed, resets scheduling)
  - Delete: confirm dialog
- Bulk actions: delete selected, move selected to another folder

### 3. Settings View

- **Default ease factor** (applied to new cards)
- **Daily new card limit** (max new cards introduced per day per folder)
- **Daily review limit** (max reviews per day per folder)
- **Theme** (light / dark)
- **Import / Export** (JSON format containing all folders + cards + scheduling state)

## Constraints & Rules

- Folder names must be unique and non-empty
- Cards must belong to exactly one folder
- Cloze cards must contain at least one `{{cloze}}` marker or show a validation error
- All timestamps stored in UTC
- Scheduling state is never shared across quiz-facing sides of a reversible card