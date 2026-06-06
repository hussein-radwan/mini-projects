# People Pulse Survey - Setup Guide

## Step 1: Create the Google Sheet

1. Create a new Google Sheet
2. Copy its ID from the URL: `https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit`
3. Paste it into `Code.gs` at the top: `const SS_ID = 'paste-here';`

## Step 2: Create the Apps Script project

1. In the Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code in `Code.gs` and paste the contents of `Code.gs` from this folder
3. Click **+** to add a new HTML file, name it `survey` (no extension), paste the contents of `survey.html`

## Step 3: Initialize the sheets

1. In Apps Script, select the `setupSheets` function from the dropdown
2. Click **Run** — this creates all required tabs with the correct headers:
   - `Settings` — survey year, release date, open/closed toggle
   - `Submissions Log` — email + year only (used to block double submission)
   - `Drafts` — in-progress responses keyed by email + year
   - `Employees` — lookup table for demographics
   - `Responses` — anonymous submitted responses

## Step 4: Populate the Employees sheet

The `Employees` sheet needs these columns (exact names, case-insensitive):

| Email | Name | Department | Tenure Band | Region | Gender |
|-------|------|------------|-------------|--------|--------|

Populate this from your HR data. Tenure Band values should match whatever bands you use (e.g. `< 1 year`, `1-3 years`, etc.)

## Step 5: Configure Settings sheet

| Key | Value |
|-----|-------|
| Survey Year | 2026 |
| Release Date | 2026-05-01 (leave blank to open immediately) |
| Survey Open | true |

To close the survey: set `Survey Open` to `false`.
For next year's survey: update `Survey Year` to 2027 and set a new `Release Date`. Previous year responses are preserved with their year column.

## Step 6: Deploy

1. In Apps Script, click **Deploy > New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone within [your Workspace domain]** (e.g. dsquares.com)
5. Click **Deploy** and copy the web app URL
6. Share that URL with employees via email or Google Chat

## How it works

- The app reads the logged-in Google account automatically — no email input required
- If the user has already submitted for the current survey year, they see a "already submitted" screen
- Progress auto-saves every 2 seconds after each answer — users can close the tab and return later
- Final submission writes an anonymous row to `Responses` (no email, no name — just demographics + scores) and logs email+year to `Submissions Log`
- The `Drafts` row is deleted on submission

## Adding Arabic translations

The `survey.html` file has all Arabic strings as `ar:` properties next to each `en:` string. Currently placeholders are included. When translations are ready, update each `ar:` value in the `SECTIONS` array in `survey.html`.

## Sheet: Responses — column structure

`Year | Department | Tenure Band | Region | Gender | [question keys...]`

Question keys are listed in `QUESTION_KEYS` in `Code.gs`. Each key maps to one column. Follow-up (open text) answers have their own key/column.

## Scoring logic (for the analysis sheet)

- **Likert questions**: score = % of responses that are 4 or 5 (Agree / Strongly Agree) = favourability
- **eNPS**: Promoters (9-10) minus Detractors (1-6), divided by total respondents × 100
- **Wellbeing Index**: average of 1-10 scores
- **Metric score**: average favourability of all questions under that metric
- **Dimension score**: average of all metric scores under that dimension
- **Thresholds**: Green = 75+, Yellow = 60-74, Red = <60

## Future improvements

If translations or questions need updating again, consider storing them in a Google Sheet tab instead of embedding in the HTML. Apps Script can read from the sheet at runtime, avoiding the need for large code edits and reducing token overhead. For example:
- Add a `Questions` sheet with columns: `Key`, `Dimension`, `English`, `Arabic`, `Type`, `Required`
- In `Code.gs`, fetch and parse this data on page load
- Pass it to the HTML, which renders dynamically instead of using hardcoded SECTIONS array

This also makes it easier for non-developers to update translations without touching code.
