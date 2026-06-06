# Deployment Instructions: World Cup Country Draft

This document provides step-by-step instructions to deploy and host the World Cup Country Draft application for free using Google Sheets and Google Apps Script.

---

## Step 1: Create the Google Sheet Database
1. Go to [Google Sheets](https://sheets.google.com) and create a **blank spreadsheet**.
2. Name the sheet (e.g., `World Cup Country Draft 2026`).
3. You do *not* need to create any tab names or headers manually. The initialization script will create and format them automatically.

---

## Step 2: Open the Apps Script Editor
1. In your new Google Sheet, click on **Extensions** in the top menu bar.
2. Select **Apps Script**. This will open a new Apps Script project environment bound to your spreadsheet.
3. Rename the project in the top-left from "Untitled project" to `World Cup Draft Server`.

---

## Step 3: Copy Code Files
We need to copy the backend script and the frontend HTML code into the editor.

### 1. Backend (`Code.gs`)
- By default, you will see a file named `Code.gs` in the left sidebar.
- Click it, clear any placeholder code, and copy the full contents of the local [Code.gs](file:///Users/radwan/Documents/Projects%20and%20Workflows/World%20Cup%20Game/Code.gs) file and paste it into the editor.
- Click the **Save** (floppy disk) icon at the top of the editor.

### 2. Frontend (`Index.html`)
- In the left sidebar, click the **`+` (Add a file)** button and select **HTML**.
- Name the file **`Index`** (Google Apps Script will automatically append `.html`).
- Clear all template lines in the new file, copy the full contents of the local [Index.html](file:///Users/radwan/Documents/Projects%20and%20Workflows/World%20Cup%20Game/Index.html) file, and paste it into the editor.
- Click the **Save** icon.

---

## Step 4: Initialize the Spreadsheet Database
Before deploying the web app, we need to run the setup script to construct the sheet structure and preload the 48 participating countries:
1. In the top toolbar of the Apps Script editor, look for the function dropdown (which might say `doGet` by default).
2. Select **`initializeDatabase`** from the dropdown.
3. Click the **Run** button (looks like a play button).
4. Google will request permissions to access your spreadsheet. Click **Review Permissions**, select your Google Account, click **Advanced** (in small text), and click **Go to World Cup Draft Server (unsafe)**. Click **Allow**.
5. Once completed, check the execution log at the bottom. It should show: `Notice: Execution completed`.
6. Return to your Google Sheet. You will now see 6 tabs created: `Config`, `Players`, `Draft`, `Teams`, `Matches`, and `Leaderboard`, with `Teams` populated with the 48 preloaded teams, tiers, groupings, and flag codes.

---

## Step 5: Deploy the Web Application
Now we will make the frontend dashboard accessible online:
1. In the top right corner of the Apps Script editor, click **Deploy** -> **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Fill out the configuration:
   - **Description:** `World Cup Draft v1.0`
   - **Execute as:** Select **Me (your-email@gmail.com)**
   - **Who has access:** Select **Anyone** (This is crucial so your league managers can load the dashboard without needing a Google login).
4. Click **Deploy**.
5. Copy the **Web App URL** provided under the "Web app" section (it ends in `/exec`). Save this URL; this is the link you will share with your league players to access the game!

---

## Step 6: Automate Live Scores (Time-Driven Trigger)
To ensure the dashboard periodically pulls scoreboards and updates player rankings every 15 minutes during the tournament:
1. In the left-hand sidebar of the Apps Script editor, click on the **alarm clock icon** (**Triggers**).
2. Click the **+ Add Trigger** button in the bottom right.
3. Configure the trigger settings:
   - **Choose which function to run:** `syncLiveScores`
   - **Choose which deployment to run:** `Head`
   - **Select event source:** `Time-driven`
   - **Select type of time based trigger:** `Minutes timer`
   - **Select minute interval:** `Every 15 minutes`
4. Click **Save**. (If prompted, review and authorize permissions again).

---

## Step 7: How to Test (Bracket Mock Simulations)
We built an automated simulator in the dashboard so you can test the draft flow, drafting constraints, and points recalculations without waiting for real matches to begin.

1. Open your **Web App URL** in a browser. You will be greeted by the **Setup Screen**.
2. Enter an **Admin Passcode** (default `1234`) and add the names of your league managers (e.g. 4, 6, or 8 players). Click **Initialize League**.
3. You will enter the **Draw Order Screen**. Click on the golden capsules in the bowl one-by-one. Watch them split open and reveal the draft order. Once completed, click **Enter Draft Room**.
4. You are now in the **Draft Room**. Try drafting countries for players. Notice how the turn shifts in a snake format (1-2-3-4, 4-3-2-1). If you try to draft two teams in the same group for the same player, the group lock will block you (unless you have no other choice).
5. Once all 48 teams are drafted, the game transitions to the **Active Tournament Dashboard**.
6. Switch to the **Admin** tab at the bottom right. Input `1234` to unlock the dashboard.
7. Click **Simulate Next Bracket Stage (Group)**. This will instantly simulate all 72 group stage matches, write the scores to the sheet, and calculate leaderboard rankings.
8. Click the button again to simulate the **Round of 32**, **Round of 16**, **Quarter-Finals**, and so on, until the World Cup Champion is crowned! Click on any player card in the **Standings** tab to see their active drawer breakdown.
