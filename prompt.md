# Master Builder Prompt: World Cup Country Draft

Copy and paste the prompt below into a new AI assistant session when you are ready to construct the application in a new repository.

***

```text
You are an expert full-stack developer specializing in Google Workspace, Google Apps Script (GAS), and high-fidelity, responsive web dashboards.

Your task is to build a "World Cup Country Draft" web application. This is a mini-fantasy game for a group of 5–8 players (typically 4, 6, or 8) for the 2026 World Cup. Instead of drafting individual players, participants draft whole countries (snake draft) and gain points from real-life match results (Wins, Draws, Goals) scaled by the country's tier multiplier, plus flat knockout progress points.

---

### Tech Stack & Hosting
1. Backend: Google Sheets (database) & Google Apps Script (Server).
2. Frontend: Single-page App using HTML5, CSS (styled as a premium sports dashboard), and Vanilla Javascript.
3. Hosting: Served for free via Apps Script Web App execution (`doGet(e)` serving HTML).

---

### STEP 1: Spreadsheet Structure (Database)
Create an initialization function `initializeDatabase()` in `Code.gs` that sets up the following sheets and structures:
1. `Config` -> Columns: Setting, Value
   - Pre-populate: `DraftStatus` (Setup), `Passcode` (set by admin), `ActivePlayerIndex` (0), `PickNumber` (1)
2. `Players` -> Columns: Player Name, Pick Order (randomized during Draw Order phase)
3. `Draft` -> Columns: Pick Number, Round, Player Name, Country Chosen, Group Letter
4. `Teams` -> Columns: Country Name, Group, FIFA Rank, Tier (1-4), Multiplier, Owner, Goals Scored, Wins, Draws, Current Stage, Total Points Contributed
   - Pre-load the 48 participating teams for the 2026 World Cup, their official groupings (A through L), and Tiers:
     - Tier 1 (Rank 1-12): Multiplier 1.0x
     - Tier 2 (Rank 13-24): Multiplier 1.25x
     - Tier 3 (Rank 25-36): Multiplier 1.6x
     - Tier 4 (Rank 37-48): Multiplier 2.0x
5. `Matches` -> Columns: Match ID, Stage, Team A, Team B, Score A, Score B, Status (Scheduled/Live/FT), Winner, Shootout Winner, Date

---

### STEP 2: Apps Script Server-Side (`Code.gs`)
Implement the following server functions:
1. `doGet(e)`: Serves `Index.html` with mobile viewport meta tag.
2. `getDashboardData()`: Merges all database sheets into a single JSON payload. Cache this payload in `CacheService` for 10 minutes (except during Setup/Drafting phases) to ensure load times under 2s.
3. `drawCapsule(ballId)`: Shuffles player names that have not yet been assigned a pick order, assigns the next pick number to a player, and records it in `Players` sheet.
4. `draftCountry(player, country)`:
   - Verifies it is the player's turn (snake order sequence: 1-2-3-4, 4-3-2-1).
   - Validates that the country's group is not already owned by the player (unless all remaining available countries belong to groups the player already owns).
   - Assigns country to the player in `Teams` sheet, logs the action in `Draft` sheet, increments `PickNumber`, and updates `ActivePlayerIndex`.
5. `syncLiveScores()`: Fetches matches from a free football API, updates the `Matches` sheet, and triggers `recalculatePoints()`.
6. `recalculatePoints()`:
   - Calculates on-field performance: `(Wins * 3 + Draws * 1 + Goals * 0.5) * Multiplier` (wins/draws/goals during R32, R16, QF, SF, Finals on-pitch time are included; penalty shootouts award 1.5 base points to the shootout winner and do not count as wins/draws or add shootout goals to the goal tally).
   - Calculates progress bonuses (flat, non-multiplied, non-stacking): R32 (+1), R16 (+2), QF (+4), SF (+6), Finalist (+8), Champion (+12).
   - Updates total points in `Teams` and aggregates standings in `Leaderboard` matrix.

---

### STEP 3: Frontend View (`Index.html`)
Design a premium, responsive interface using standard HTML/CSS/JS.

#### Styling Guidelines (Sports Theme):
- Background: Gradient `linear-gradient(135deg, #071714, #040911)`.
- Typography: Imported `Outfit` font from Google Fonts.
- Containers: Translucent card frames using `backdrop-filter: blur(12px)`, thin borders (`rgba(255,255,255,0.06)`), and subtle shadows.
- Accent colors: Neon emerald (`#10b981`) and trophy gold (`#f59e0b`).
- Flags: Rendered as clean, circular flag icons using CSS clip-path or circular divs loaded from a public flag API (e.g. `flagcdn.com`).

#### Views to Implement (Governed by `DraftStatus`):
1. **Setup Screen:** Clean form for the admin to enter player names and define a passcode.
2. **Draw Order Screen:** An animation of a glass bowl containing floating golden balls. Clicking a ball runs a capsule opening animation, displaying the paper slip containing a player name and their pick order number.
3. **Draft Room Screen:**
   - **Header:** Shows the manager currently on the clock, a visual snake order queue, and a sticky **Draft Rules Banner** detailing Snake draft order, the Group Lock rule, and Multiplier scales.
   - **Main area:** Four columns: Pot 1 (1.0x), Pot 2 (1.25x), Pot 3 (1.6x), Pot 4 (2.0x). Each contains circular flag icons of the countries.
   - **Logic:** Dynamically disable/grey out flags from groups the active player has already drafted from, unless that group is their only available choice. Clicking a flag prompts a confirmation modal and posts the choice to the backend.
4. **Tournament Dashboard Screen:**
   - Sticky bottom navigation bar (Leaderboard / Match Centre / Draft Board / Rules).
   - **Leaderboard View:** Rank cards showing players by points. Clicking a player card slides down an drawer listing their 12 teams, each team's multiplier, and a breakdown of their points (group match wins, draws, goals, and bracket advancement).
   - **Match Centre View:** Chronological fixtures styled as **Player vs. Player** matchups (e.g. "Dave vs. Sarah", showing England's flag next to Dave and Morocco's next to Sarah, with scorelines, match minutes, and ownership indicators). Mark matches owned by the same player as "Friendly Fire".
   - **Rules View:** Simple tabular layouts detailing the scoring system for players.

---

### STEP 4: Deployment Instructions
Provide step-by-step documentation on setting up the Google Sheet, opening the Apps Script editor, copying the code files, setting up a time-driven trigger for `syncLiveScores()` to run every 15 minutes, and deploying the Web App with access set to "Anyone".
```
