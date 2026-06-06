# Product Requirements Document (PRD): World Cup Country Draft

## 1. Product Overview & Goal
The **World Cup Country Draft** is a mini-fantasy game designed for **5–8 players** (optimized for 4, 6, or 8) for the 2026 FIFA World Cup. 

Instead of drafting individual players, participants draft **entire countries** (national teams) in a live snake draft. Players earn points based on their countries' real-life performance (wins, draws, goals scored) multiplied by their strength tier, plus flat bracket advancement bonuses.

The system will run as a serverless Google Apps Script Web App backed by a Google Sheets database, with zero hosting cost.

---

## 2. Draft Rules & Mechanics
### A. The Draft Order Randomizer (The FIFA Draw)
* **The Visuals:** A digital glass bowl with floating golden capsules representing each player.
* **The Flow:** Clicking a capsule opens it to reveal a player's name. The order in which names are drawn determines their pick order (1st draw = Pick #1, last draw = Pick #8).

### B. Snake Draft Selection
* **Structure:** A standard snake draft (e.g. Rounds: 1-2-3-4, 4-3-2-1).
* **Pot-based Grid:** Teams are displayed in 4 columns corresponding to their Tiers/Pots, using circular flag icons.
* **Group Lock Rule:** To prevent point cannibalization and maximize league matchups, a player **cannot select a team from a group (Groups A through L) they have already drafted from**, unless all other available groups are taken.
* **Draft Rules Banner:** A compact rules card must be visible on the draft screen explaining the Snake order, Group Lock rule, and Multipliers.

---

## 3. Scoring System (Moderate Multiplier + Flat KO)
Points are calculated by multiplying on-field match performance by the team's tier, and adding flat advancement bonuses.

### A. Tiers & Multipliers
The 48 participating countries are divided into 4 Tiers based on their official FIFA rankings:

| Tier | World Ranking | Multiplier | Points Equation |
| :--- | :---: | :---: | :--- |
| **Tier 1 (Elites)** | 1st – 12th | **1.0x** | `(Base Match Points) * 1.0` |
| **Tier 2 (Strong)** | 13th – 24th | **1.25x** | `(Base Match Points) * 1.25` |
| **Tier 3 (Competitive)**| 25th – 36th | **1.6x** | `(Base Match Points) * 1.6` |
| **Tier 4 (Underdogs)** | 37th – 48th | **2.0x** | `(Base Match Points) * 2.0` |

### B. On-Field Match Performance (Multiplied)
Calculated for all matches (Group Stage and Knockouts):
* **Match Win:** 3 points
* **Match Draw:** 1 point (Group stage, or full-time draws in knockouts)
* **Goal Scored:** 0.5 points (No negative points for goals conceded)
* **Shootout Win:** 1.5 points (Awarded to the team advancing via penalties; does not get Win/Draw points)

$$\text{Match Points} = (\text{Wins} \times 3 + \text{Draws} \times 1 + \text{Goals} \times 0.5) \times \text{Multiplier}$$

### C. Bracket Progress (Flat, Non-Multiplied)
Flat bonuses given at the end of the tournament based on the furthest stage reached (non-stacking):
* **Qualify for Round of 32:** +1 point
* **Qualify for Round of 16:** +2 points
* **Qualify for Quarter-Finals:** +4 points
* **Qualify for Semi-Finals:** +6 points
* **Reach the Final (Runner-up):** +8 points
* **World Cup Champion:** +12 points

---

## 4. User Views & Core Features
### A. Leaderboard View
* Ranks players by cumulative points.
* Expandable player cards showing their drafted teams, flags, groups, and a detailed breakdown of points contributed by each team (match stats + bracket progress).

### B. Match Centre (Manager vs. Manager View)
* Displays fixtures sorted chronologically.
* Cards are labeled as **Player vs. Player** (e.g. **Dave vs. Sarah**), showing the countries they represent in that match, live scores, and status.
* If a player owns both teams in a matchup, it is labeled as a **"Friendly Fire"** card.

### C. Admin View
* Allows the admin to input draft picks manually if needed, override scorelines, or trigger a manual score sync.

---

## 5. Caching & Performance
* Match data and leaderboard calculations will be cached in Google Apps Script `CacheService` for 10 minutes to guarantee page load times under 2 seconds.
