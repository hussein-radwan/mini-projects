# 2026 World Cup Game Ideas

Here are 4 cool, simple, and highly engaging game concepts designed for a small group of **5–8 players**. These are optimized for a Google Sheet + Google Apps Script backend (or a simple web app frontend).

---

## Idea 1: Country Draft (Mini-Fantasy)
*Draft countries, not players.*
- **Concept:** A snake draft where each player drafts a portfolio of 4–6 countries before the tournament begins.
- **How it works:**
  - With 32 teams and 8 players, each player can draft exactly 4 countries.
  - **Scoring System:**
    - Group Stage Win: +3 pts | Draw: +1 pt
    - Qualify for Round of 16: +5 pts
    - Quarter-Final Win: +8 pts
    - Semi-Final Win: +12 pts
    - World Cup Winner: +20 pts
    - *Optional Goal Bonus:* +1 pt per goal scored by your countries (incentivizes draft picks like high-scoring, entertaining teams).
- **Why it's great:** 
  - Extremely easy to manage in a Google Sheet.
  - Keeps players invested in matches they wouldn't normally watch (e.g., cheering for Senegal or Japan because they drafted them).
  - Draft night is a fun pre-tournament social event.

---

## Idea 2: Risk-Reward Score Predictor
*Predict exact scorelines with a confidence-points twist.*
- **Concept:** Players predict the outcome/score of selected matches, but they must allocate a daily "confidence budget" to their picks.
- **How it works:**
  - For each matchday, players get a budget of 10 points to distribute across the scheduled matches.
  - **Points System:**
    - Correct Winner/Draw (1x multiplier * confidence points allocated)
    - Correct Exact Score (3x multiplier * confidence points allocated)
  - **Example:** If you put 5 confidence points on "France 2 - 1 Poland":
    - France wins 1-0: You get 5 points.
    - France wins 2-1: You get 15 points.
    - France draws/loses: You get 0 points.
- **Why it's great:** Adds a layer of wagering/strategy without using real money. Apps Script can easily parse scores and calculate points daily.

---

## Idea 3: World Cup "Survivor" / Eliminator Pool
*Don't get knocked out.*
- **Concept:** A classic survivor pool adapted to the tournament schedule.
- **How it works:**
  - Every matchday (or stage), players must pick **one** country to win their match.
  - If your chosen team wins, you survive. If they draw or lose, you lose a life (players start with 2 or 3 lives).
  - **The Catch:** You can only pick a country **once** during the entire tournament. If you pick Argentina in the group stage, you cannot pick them in the quarter-finals.
  - Last survivor wins.
- **Why it's great:** Highly strategic. Do you use your heavy hitters (Brazil, France) early to guarantee survival, or save them for the knockout rounds?

---

## Idea 4: The Bidding/Auction Bracket
*Bid on countries to build your custom bracket.*
- **Concept:** Instead of picking a standard bracket, players start with a virtual bank of $100 and bid on teams in a live auction.
- **How it works:**
  - Every country in the World Cup is put up for auction.
  - Players bid to "own" teams.
  - You score points when your owned teams advance in the tournament.
  - **Payout System:** Payouts increase per round (e.g., owning a Round of 16 team pays $5, Quarter-final pays $10, Winner pays $50).
  - The player with the highest total payout at the end wins.
- **Why it's great:** Combines the fun of a fantasy auction with standard bracket dynamics. Makes the draft phase highly interactive.
