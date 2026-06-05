# People Pulse Dashboard - Plan

Companion HR-only dashboard for analyzing People Pulse Survey responses.

## Architecture

- **Separate Apps Script project** (not the survey one) - cleaner access control and won't risk breaking the survey while iterating
- Reads from the same Google Sheet via `SpreadsheetApp.openById(SS_ID)`
- Sheet ID: `1QeIYqGnBUdUuWRmqKaemxmb3Q6OSQFUnhK3wdax9e6E`
- Aggregation done server-side in Apps Script; HTML dashboard receives clean numbers (keeps anonymity in transit, faster load)
- Deployment: restricted to specific HR users (Khaled Nazif, Radwan, Remi Hajo, etc.) - not domain-wide

## Sheet Schema (data sources)

### Responses (analysis source)
| Year | Department | Tenure Band | Region | Gender | Age | enps_enps_1 | eng_engagement_1 | ... [62 question keys] ... | New Department | Division |

- Columns 1-6: demographics
- Columns 7-68: question answers (Likert 1-5, 1-10 sliders, or qualitative text)
- Last 2 columns: New Department, Division

### Questions (lookup for question metadata)
| Key | Dimension | Focus Area | Question (English) | Question (Arabic) | Scoring |

- Use this to join response columns to their dimension/focus area
- `Scoring` field distinguishes: `Likert`, `1-10`, `Qualitative`, `Select`

### Settings, Employees, Submissions Log, Drafts
Not used by dashboard directly (operational sheets for the survey itself).

## Pages (tabs)

### 1. Overview
Top-line KPIs and at-a-glance health of the survey.

**Top row - KPI cards:**
- Response rate (`XX/YYY (ZZ%)`)
- eNPS (-100 to +100, color-coded)
- Wellbeing Index (avg of 1-10 scores)
- Overall favorability (% of all Likert answers that are 4 or 5)

**Middle row - Dimension scorecard:**
- Horizontal bar chart of all 7 dimensions (eNPS, Engagement, Culture, Wellbeing, Leadership, Reward & Recognition, Intention to Stay)
- Sorted descending by score
- Color-coded green/amber/red (75+ / 60-74 / <60)

**Bottom row - Highlights and risks:**
- Top 3 highest-scoring questions ("what's working")
- Top 3 lowest-scoring questions ("what to address")
- Intention to Stay distribution (% saying 1-2 / 3-5 / 6+ years)

**Open decisions:**
- Response rate denominator: all employees (245) or only those >3 months who could actually submit?
- Top/bottom 3 questions: full text or abbreviated?

### 2. Breakdown
Segmentation view. Dimensions or focus areas broken down by employee cohort.

**Top strip - Bright spots and Watch list:**
- Two side-by-side sections, cohort-aware (update when cohort selector changes)
- Bright spots: top 3 cohort/dimension combinations significantly above average
- Watch list: top 3 cohort/dimension combinations significantly below average
- Not hero cards - thin context strip above the matrices

**Main heatmap matrix:**
- Row axis selector: Dimensions, Focus Areas, or Dimensions (expands to Focus Areas on click within the main matrix)
- Column axis selector: Department, New Department, Division, Tenure Band, Region, Gender, Age
- Company average column pinned as leftmost data column with a visual separator
- Score/Delta toggle: switch cells between raw score and delta vs company average
- Color coding: green/amber/red for scores; green positive / red negative for delta mode
- Cells below anonymity floor show hatched pattern with "Not enough responses" tooltip
- `n=` count visible on hover only (not cluttering every cell)
- Columns sortable by score descending

**Second heatmap matrix (drill-down):**
- Appears below the main matrix when user clicks any row in the main matrix
- Shows all cohort columns (same as main matrix)
- If user clicked a dimension row: rows = focus areas within that dimension
- If user clicked a focus area row: rows = individual questions within that focus area
- This is the floor - no further drill-down from questions
- Clicking a different row in the main matrix replaces the second matrix content

### 3. Correlation
Pick a target metric and see which questions are the strongest drivers of it.

- Target selector: eNPS, Intention to Stay, Overall Engagement, Wellbeing Index
- Output: ranked list of driver questions, split into positive drivers (top-N) and negative drivers (top-N)
- Bar chart showing correlation strength (Pearson for Likert pairs)
- Framing is actionable: "People who score low on Manager Listening are 3x more likely to score low on eNPS"
- Avoids showing a full 50x50 correlation matrix

### 4. Qualitative
Talk to the open-text responses via Gemini.

- Cohort and dimension/focus area filter at top
- Step 1: Auto-generated structured summary on load (top themes, sentiment, sample quotes)
- Step 2: Open chat - follow-up questions answered by Gemini from the qualitative dataset
- Gemini API key stored in Apps Script Properties Service
- Uses `UrlFetchApp` to call Gemini API
- Chat state kept in browser session (not persisted)
- Privacy: comfortable sending qualitative responses to Gemini (same Google ecosystem)

### 5. Drafts
Survey participation status view for HR.

- TBD - needs design discussion

### 6. Historic View
Year-over-year trend view.

- Locked until next survey cycle (no 2025 data to compare against yet)
- Will show delta vs prior year per dimension/focus area
- TBD - design when data exists

## Scoring logic

- **Likert questions**: favorability = % of responses that are 4 or 5
- **eNPS**: (Promoters 9-10 minus Detractors 1-6) / total × 100
- **Wellbeing Index**: average of 1-10 scores
- **Focus area score**: average favorability of all Likert questions in that focus area
- **Dimension score**: average of all focus area scores under that dimension
- **Thresholds**: Green = 75+, Amber = 60-74, Red = <60
- **eNPS thresholds**: Green = +20 and above, Amber = 0-19, Red = below 0
- **Wellbeing thresholds**: Green = 7.5+, Amber = 6.0-7.4, Red = <6.0

## Cross-cutting features

- **Anonymity floor**: minimum cohort size before showing breakdowns (TBD, likely 5-8)
- **Brand consistency**: navy `#0b2e8c`, white cards, Inter font, green/amber/red palette
- **Access**: restrict deployment to specific HR users, not domain-wide

## Tech Notes

- Gemini API key: available, stored in Apps Script Properties Service
- Anonymity floor: TBD
- Access: restrict deployment to specific HR users (not domain-wide)

## Open Items Before Build

1. Confirm anonymity floor (e.g., n>=5 to show a cohort breakdown)
2. Confirm Overview decisions (response rate denominator, question text format)
3. Confirm full list of HR users who should have access
4. Confirm what the Drafts page should show
