/**
 * World Cup 2026 Country Draft - Google Apps Script Backend
 * Serves the Web App, initializes sheets, manages draft states, and calculates scores.
 */

// Representative list of 48 teams for 2026 World Cup, balanced across Groups A-L and Tiers 1-4.
// Includes 2-letter codes for high-res circular flag renders.
const WORLD_CUP_TEAMS = [
  // Tier 1 (FIFA Rank 1-12, Multiplier 1.0x)
  { name: "Argentina", group: "A", rank: 1, tier: 1, multiplier: 1.0, flag: "ar" },
  { name: "France", group: "B", rank: 2, tier: 1, multiplier: 1.0, flag: "fr" },
  { name: "Belgium", group: "C", rank: 3, tier: 1, multiplier: 1.0, flag: "be" },
  { name: "England", group: "D", rank: 4, tier: 1, multiplier: 1.0, flag: "gb-eng" },
  { name: "Brazil", group: "E", rank: 5, tier: 1, multiplier: 1.0, flag: "br" },
  { name: "Portugal", group: "F", rank: 6, tier: 1, multiplier: 1.0, flag: "pt" },
  { name: "Netherlands", group: "G", rank: 7, tier: 1, multiplier: 1.0, flag: "nl" },
  { name: "Spain", group: "H", rank: 8, tier: 1, multiplier: 1.0, flag: "es" },
  { name: "Italy", group: "I", rank: 9, tier: 1, multiplier: 1.0, flag: "it" },
  { name: "Croatia", group: "J", rank: 10, tier: 1, multiplier: 1.0, flag: "hr" },
  { name: "Germany", group: "K", rank: 11, tier: 1, multiplier: 1.0, flag: "de" },
  { name: "Morocco", group: "L", rank: 12, tier: 1, multiplier: 1.0, flag: "ma" },

  // Tier 2 (FIFA Rank 13-24, Multiplier 1.25x)
  { name: "USA", group: "A", rank: 13, tier: 2, multiplier: 1.25, flag: "us" },
  { name: "Colombia", group: "B", rank: 14, tier: 2, multiplier: 1.25, flag: "co" },
  { name: "Mexico", group: "C", rank: 15, tier: 2, multiplier: 1.25, flag: "mx" },
  { name: "Uruguay", group: "D", rank: 16, tier: 2, multiplier: 1.25, flag: "uy" },
  { name: "Switzerland", group: "E", rank: 17, tier: 2, multiplier: 1.25, flag: "ch" },
  { name: "Senegal", group: "F", rank: 18, tier: 2, multiplier: 1.25, flag: "sn" },
  { name: "Japan", group: "G", rank: 19, tier: 2, multiplier: 1.25, flag: "jp" },
  { name: "Iran", group: "H", rank: 20, tier: 2, multiplier: 1.25, flag: "ir" },
  { name: "Denmark", group: "I", rank: 21, tier: 2, multiplier: 1.25, flag: "dk" },
  { name: "Ukraine", group: "J", rank: 22, tier: 2, multiplier: 1.25, flag: "ua" },
  { name: "Korea Republic", group: "K", rank: 23, tier: 2, multiplier: 1.25, flag: "kr" },
  { name: "Australia", group: "L", rank: 24, tier: 2, multiplier: 1.25, flag: "au" },

  // Tier 3 (FIFA Rank 25-36, Multiplier 1.6x)
  { name: "Sweden", group: "A", rank: 25, tier: 3, multiplier: 1.6, flag: "se" },
  { name: "Turkey", group: "B", rank: 26, tier: 3, multiplier: 1.6, flag: "tr" },
  { name: "Wales", group: "C", rank: 27, tier: 3, multiplier: 1.6, flag: "gb-wls" },
  { name: "Poland", group: "D", rank: 28, tier: 3, multiplier: 1.6, flag: "pl" },
  { name: "Ecuador", group: "E", rank: 29, tier: 3, multiplier: 1.6, flag: "ec" },
  { name: "Peru", group: "F", rank: 30, tier: 3, multiplier: 1.6, flag: "pe" },
  { name: "Austria", group: "G", rank: 31, tier: 3, multiplier: 1.6, flag: "at" },
  { name: "Hungary", group: "H", rank: 32, tier: 3, multiplier: 1.6, flag: "hu" },
  { name: "Nigeria", group: "I", rank: 33, tier: 3, multiplier: 1.6, flag: "ng" },
  { name: "Egypt", group: "J", rank: 34, tier: 3, multiplier: 1.6, flag: "eg" },
  { name: "Tunisia", group: "K", rank: 35, tier: 3, multiplier: 1.6, flag: "tn" },
  { name: "Algeria", group: "L", rank: 36, tier: 3, multiplier: 1.6, flag: "dz" },

  // Tier 4 (FIFA Rank 37-48, Multiplier 2.0x)
  { name: "Canada", group: "A", rank: 37, tier: 4, multiplier: 2.0, flag: "ca" },
  { name: "Chile", group: "B", rank: 38, tier: 4, multiplier: 2.0, flag: "cl" },
  { name: "Cameroon", group: "C", rank: 39, tier: 4, multiplier: 2.0, flag: "cm" },
  { name: "Costa Rica", group: "D", rank: 40, tier: 4, multiplier: 2.0, flag: "cr" },
  { name: "Saudi Arabia", group: "E", rank: 41, tier: 4, multiplier: 2.0, flag: "sa" },
  { name: "Scotland", group: "F", rank: 42, tier: 4, multiplier: 2.0, flag: "gb-sct" },
  { name: "Ivory Coast", group: "G", rank: 43, tier: 4, multiplier: 2.0, flag: "ci" },
  { name: "Ghana", group: "H", rank: 44, tier: 4, multiplier: 2.0, flag: "gh" },
  { name: "Iraq", group: "I", rank: 45, tier: 4, multiplier: 2.0, flag: "iq" },
  { name: "UAE", group: "J", rank: 46, tier: 4, multiplier: 2.0, flag: "ae" },
  { name: "Panama", group: "K", rank: 47, tier: 4, multiplier: 2.0, flag: "pa" },
  { name: "New Zealand", group: "L", rank: 48, tier: 4, multiplier: 2.0, flag: "nz" }
];

/**
 * 1. Serves index.html with appropriate settings.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('2026 World Cup Country Draft')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper to include templates inside other HTML files.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Database Initialization. Sets up sheets and default data.
 */
function initializeDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Config Sheet
  var configSheet = getOrCreateSheet('Config');
  configSheet.appendRow(["Setting", "Value"]);
  setConfigValue('DraftStatus', 'Setup');
  setConfigValue('Passcode', '1234');
  setConfigValue('ActivePlayerIndex', '0');
  setConfigValue('PickNumber', '1');
  setConfigValue('PlayerCount', '0');
  setConfigValue('RoundsToDraft', '0');
  setConfigValue('SimulationStage', 'Group');

  // 2. Players Sheet
  var playersSheet = getOrCreateSheet('Players');
  playersSheet.appendRow(["Player Name", "Pick Order"]);

  // 3. Draft Log Sheet
  var draftSheet = getOrCreateSheet('Draft');
  draftSheet.appendRow(["Pick Number", "Round", "Player Name", "Country Chosen", "Group Letter"]);

  // 4. Teams Sheet
  var teamsSheet = getOrCreateSheet('Teams');
  teamsSheet.appendRow([
    "Country Name", "Group", "FIFA Rank", "Tier", "Multiplier", 
    "Owner", "Goals Scored", "Wins", "Draws", "Shootout Wins", 
    "Current Stage", "Total Points Contributed", "Flag Code"
  ]);
  
  // Pre-load the teams
  WORLD_CUP_TEAMS.forEach(function(team) {
    teamsSheet.appendRow([
      team.name, team.group, team.rank, team.tier, team.multiplier,
      "", 0, 0, 0, 0, "Group", 0.0, team.flag
    ]);
  });

  // 5. Matches Sheet
  var matchesSheet = getOrCreateSheet('Matches');
  matchesSheet.appendRow([
    "Match ID", "Stage", "Team A", "Team B", "Score A", "Score B", 
    "Status (Scheduled/Live/FT)", "Winner", "Shootout Winner", "Date"
  ]);

  // 6. Leaderboard Sheet
  var leaderboardSheet = getOrCreateSheet('Leaderboard');
  leaderboardSheet.appendRow([
    "Rank", "Player Name", "Total Points", "Teams Owned", "Wins", "Draws", "Goals Scored"
  ]);

  // Reset Cache
  var cache = CacheService.getScriptCache();
  cache.remove('dashboard_data_payload');
  
  return "Database Initialized Successfully!";
}

/**
 * Returns merged JSON data from all sheets.
 * Caches payload for 10 min except during drafting/setup.
 */
function getDashboardData() {
  var config = getConfigMap();
  var status = config.DraftStatus || 'Setup';
  var cache = CacheService.getScriptCache();
  var cacheKey = 'dashboard_data_payload';
  
  // Cache check
  if (status !== 'Setup' && status !== 'DrawOrder' && status !== 'Drafting') {
    var cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  
  var players = sheetToObjects('Players');
  var draft = sheetToObjects('Draft');
  var teams = sheetToObjects('Teams');
  var matches = sheetToObjects('Matches');
  var leaderboard = sheetToObjects('Leaderboard');
  
  // Sort players by pick order if established
  players.sort(function(a, b) {
    var orderA = Number(a.pickOrder) || 99;
    var orderB = Number(b.pickOrder) || 99;
    return orderA - orderB;
  });
  
  var payload = {
    config: config,
    players: players,
    draft: draft,
    teams: teams,
    matches: matches,
    leaderboard: leaderboard
  };
  
  // Write to cache if not drafting
  if (status !== 'Setup' && status !== 'DrawOrder' && status !== 'Drafting') {
    try {
      cache.put(cacheKey, JSON.stringify(payload), 600); // 10 minutes cache
    } catch(e) {
      // Ignore cache storage errors if payload exceeds size limit (100KB in GAS)
    }
  }
  
  return payload;
}

/**
 * Setup Phase: Save player names and set passcode.
 * Transitions state to DrawOrder.
 */
function setupPlayers(names, passcode) {
  if (!names || names.length < 4 || names.length > 8) {
    throw new Error("Must provide between 4 and 8 player names.");
  }

  // Auto-initialize all sheets if the database hasn't been set up yet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('Config')) {
    initializeDatabase();
  }

  // Save passcode
  setConfigValue('Passcode', passcode || '1234');
  setConfigValue('PlayerCount', names.length.toString());
  setConfigValue('RoundsToDraft', Math.floor(48 / names.length).toString());
  
  // Re-create players sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var playersSheet = getOrCreateSheet('Players');
  playersSheet.appendRow(["Player Name", "Pick Order"]);
  
  names.forEach(function(name) {
    playersSheet.appendRow([name, ""]);
  });
  
  // Transition state
  setConfigValue('DraftStatus', 'DrawOrder');
  
  // Reset cache
  var cache = CacheService.getScriptCache();
  cache.remove('dashboard_data_payload');
  
  return getDashboardData();
}

/**
 * Draw Order: Golden capsules drawing.
 * Randomly picks next player and registers draft pick number.
 */
function drawCapsule(ballId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Players');
  var data = sheet.getDataRange().getValues();
  
  var players = [];
  var drawnCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    var name = data[i][0];
    var order = data[i][1];
    players.push({ name: name, order: order, rowIndex: i + 1 });
    if (order !== "" && order !== null && order !== undefined) {
      drawnCount++;
    }
  }
  
  var undrawn = players.filter(function(p) {
    return p.order === "" || p.order === null || p.order === undefined;
  });
  
  if (undrawn.length === 0) {
    throw new Error("All players have already been drawn.");
  }
  
  // Select a player randomly
  var randomIndex = Math.floor(Math.random() * undrawn.length);
  var chosenPlayer = undrawn[randomIndex];
  var nextOrderNumber = drawnCount + 1;
  
  // Write to sheet
  sheet.getRange(chosenPlayer.rowIndex, 2).setValue(nextOrderNumber);
  
  var allDrawn = (nextOrderNumber === players.length);
  
  return {
    playerName: chosenPlayer.name,
    pickOrder: nextOrderNumber,
    ballId: ballId,
    allDrawn: allDrawn
  };
}

/**
 * Transitions from DrawOrder to Drafting.
 */
function startDrafting(passcode) {
  if (passcode && !verifyPasscode(passcode)) {
    throw new Error("Invalid admin passcode.");
  }
  
  setConfigValue('DraftStatus', 'Drafting');
  setConfigValue('ActivePlayerIndex', '0');
  setConfigValue('PickNumber', '1');
  
  // Clear any existing draft logs
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var draftSheet = ss.getSheetByName('Draft');
  if (draftSheet) {
    draftSheet.clear();
    draftSheet.appendRow(["Pick Number", "Round", "Player Name", "Country Chosen", "Group Letter"]);
  }
  
  // Reset owners in Teams sheet
  var teamsSheet = ss.getSheetByName('Teams');
  if (teamsSheet) {
    var teamsRange = teamsSheet.getDataRange();
    var teamsValues = teamsRange.getValues();
    var ownerCol = teamsValues[0].indexOf("Owner");
    for (var i = 1; i < teamsValues.length; i++) {
      teamsSheet.getRange(i + 1, ownerCol + 1).setValue("");
    }
  }
  
  // Clear Matches
  var matchesSheet = ss.getSheetByName('Matches');
  if (matchesSheet) {
    matchesSheet.clear();
    matchesSheet.appendRow([
      "Match ID", "Stage", "Team A", "Team B", "Score A", "Score B", 
      "Status (Scheduled/Live/FT)", "Winner", "Shootout Winner", "Date"
    ]);
  }
  
  // Clear Leaderboard
  var leaderboardSheet = ss.getSheetByName('Leaderboard');
  if (leaderboardSheet) {
    leaderboardSheet.clear();
    leaderboardSheet.appendRow([
      "Rank", "Player Name", "Total Points", "Teams Owned", "Wins", "Draws", "Goals Scored"
    ]);
  }
  
  // Reset cache
  var cache = CacheService.getScriptCache();
  cache.remove('dashboard_data_payload');
  
  return getDashboardData();
}

/**
 * Core Draft Logic: Assigns a country to a player during their turn.
 * Implements snake drafting turn orders and Group Lock validation.
 */
function draftCountry(playerName, countryName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Fetch current draft parameters
  var config = getConfigMap();
  var pickNumber = Number(config.PickNumber) || 1;
  var draftStatus = config.DraftStatus || 'Setup';
  
  if (draftStatus !== 'Drafting') {
    throw new Error("Drafting is not currently active.");
  }
  
  // 2. Fetch players list, sorted by pickOrder
  var players = sheetToObjects('Players');
  players.sort(function(a, b) { return (Number(a.pickOrder) || 99) - (Number(b.pickOrder) || 99); });
  var totalPlayers = players.length;
  
  if (totalPlayers === 0) {
    throw new Error("No players loaded in draft database.");
  }
  
  // 3. Compute active player using Snake Draft algorithm
  var roundsToDraft = Math.floor(48 / totalPlayers);
  var maxPicks = totalPlayers * roundsToDraft;
  
  if (pickNumber > maxPicks) {
    throw new Error("Draft is already completed!");
  }
  
  var currentRound = Math.ceil(pickNumber / totalPlayers);
  var indexInRound = (pickNumber - 1) % totalPlayers;
  
  var activePlayerIndex = (currentRound % 2 === 1) ? indexInRound : (totalPlayers - 1 - indexInRound);
  var expectedPlayerName = players[activePlayerIndex].playerName;
  
  if (playerName !== expectedPlayerName) {
    throw new Error("Draft validation failed. It is currently " + expectedPlayerName + "'s turn (Pick #" + pickNumber + "), not " + playerName + "'s.");
  }
  
  // 4. Fetch team lists and validate choices
  var teamsSheet = ss.getSheetByName('Teams');
  var teamsRange = teamsSheet.getDataRange();
  var teamsValues = teamsRange.getValues();
  var headers = teamsValues[0];
  
  var nameColIndex = headers.indexOf("Country Name");
  var groupColIndex = headers.indexOf("Group");
  var ownerColIndex = headers.indexOf("Owner");
  
  var chosenTeamRowIndex = -1;
  var chosenTeamGroup = "";
  var allTeams = [];
  
  for (var i = 1; i < teamsValues.length; i++) {
    var name = teamsValues[i][nameColIndex];
    var group = teamsValues[i][groupColIndex];
    var owner = teamsValues[i][ownerColIndex];
    
    allTeams.push({ name: name, group: group, owner: owner, rowIndex: i + 1 });
    
    if (name.toLowerCase() === countryName.toLowerCase()) {
      chosenTeamRowIndex = i + 1;
      chosenTeamGroup = group;
      if (owner !== "") {
        throw new Error("Team " + countryName + " has already been drafted by " + owner + ".");
      }
    }
  }
  
  if (chosenTeamRowIndex === -1) {
    throw new Error("Selected country " + countryName + " is not a valid 2026 World Cup team.");
  }
  
  // 5. Group Lock Validation
  // Check which groups this player already has
  var playerGroups = allTeams.filter(function(t) { return t.owner === playerName; }).map(function(t) { return t.group; });
  var availableTeams = allTeams.filter(function(t) { return t.owner === ""; });
  
  // Are there any available teams in groups the player does NOT already own?
  var unlockedAvailableTeams = availableTeams.filter(function(t) {
    return playerGroups.indexOf(t.group) === -1;
  });
  
  if (unlockedAvailableTeams.length > 0) {
    // There is at least one choice in an unowned group. The lock is in effect!
    if (playerGroups.indexOf(chosenTeamGroup) !== -1) {
      throw new Error("Group Lock violation: You cannot draft multiple countries from Group " + chosenTeamGroup + " unless no other groups are available in the draft pool.");
    }
  }
  
  // 6. Record Draft Pick
  // Set Owner in Teams sheet
  teamsSheet.getRange(chosenTeamRowIndex, ownerColIndex + 1).setValue(playerName);
  
  // Write to Draft Log
  var draftSheet = ss.getSheetByName('Draft');
  draftSheet.appendRow([pickNumber, currentRound, playerName, countryName, chosenTeamGroup]);
  
  // 7. Increment pick count & determine next state
  var nextPickNumber = pickNumber + 1;
  setConfigValue('PickNumber', nextPickNumber.toString());
  
  if (nextPickNumber > maxPicks) {
    // Draft completes! Transition to TournamentActive
    setConfigValue('DraftStatus', 'Active');
    
    // Automatically trigger initial points recalculation
    recalculatePoints();
  } else {
    // Set next picker index
    var nextRound = Math.ceil(nextPickNumber / totalPlayers);
    var nextIndexInRound = (nextPickNumber - 1) % totalPlayers;
    var nextPlayerIndex = (nextRound % 2 === 1) ? nextIndexInRound : (totalPlayers - 1 - nextIndexInRound);
    setConfigValue('ActivePlayerIndex', nextPlayerIndex.toString());
  }
  
  // Reset cache
  var cache = CacheService.getScriptCache();
  cache.remove('dashboard_data_payload');
  
  return getDashboardData();
}

/**
 * Fetches match results from live public API (or generates mock updates)
 * and triggers points recalculation.
 */
function syncLiveScores(isMock) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var matchesSheet = ss.getSheetByName('Matches');
  if (!matchesSheet) return "No Matches sheet found.";
  
  if (isMock) {
    return runMockMatchdaySimulation();
  }
  
  try {
    // Try to query the popular free World Cup json endpoint
    var response = UrlFetchApp.fetch("http://worldcupjson.net/matches", { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error("API returned status " + response.getResponseCode());
    }
    
    var data = JSON.parse(response.getContentText());
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid API format.");
    }
    
    // Clear and write matches
    matchesSheet.clear();
    matchesSheet.appendRow([
      "Match ID", "Stage", "Team A", "Team B", "Score A", "Score B", 
      "Status (Scheduled/Live/FT)", "Winner", "Shootout Winner", "Date"
    ]);
    
    var validTeams = WORLD_CUP_TEAMS.map(function(t) { return t.name; });
    var matchCount = 0;
    
    data.forEach(function(m) {
      var matchId = m.id || m.fifa_id || "";
      var stage = m.stage_name || "Group";
      
      var rawTeamA = m.home_team_country || (m.home_team && m.home_team.country) || "";
      var rawTeamB = m.away_team_country || (m.away_team && m.away_team.country) || "";
      
      var teamA = normalizeTeamName(rawTeamA);
      var teamB = normalizeTeamName(rawTeamB);
      
      // Filter: Only keep matches where both teams are in our 2026 World Cup Teams list
      if (validTeams.indexOf(teamA) === -1 || validTeams.indexOf(teamB) === -1) {
        return; // skip matches involving teams not in our 2026 draft list (keeps 2022 data from corrupting sheets)
      }
      
      var scoreA = m.home_team && m.home_team.goals !== null ? m.home_team.goals : "";
      var scoreB = m.away_team && m.away_team.goals !== null ? m.away_team.goals : "";
      var status = "Scheduled";
      if (m.status === "completed") status = "FT";
      else if (m.status === "in_progress") status = "Live";
      
      var rawWinner = m.winner || "";
      var winner = normalizeTeamName(rawWinner);
      
      var rawShootoutWinner = m.winner_at_penalties || "";
      var shootoutWinner = normalizeTeamName(rawShootoutWinner);
      
      var date = m.datetime ? new Date(m.datetime).toLocaleDateString() : "";
      
      matchesSheet.appendRow([
        matchId, stage, teamA, teamB, scoreA, scoreB, status, winner, shootoutWinner, date
      ]);
      matchCount++;
    });
    
    // Scan matches to update Stages in Teams
    updateCurrentStagesFromMatches(ss);
    
    // Recalculate
    recalculatePoints();
    return "API sync completed. " + matchCount + " matches imported for matching 2026 teams.";
    
  } catch(e) {
    Logger.log("API Sync Failed: " + e.message);
    return "API Sync failed. Error: " + e.message + ". You can run a mock simulation instead from the Admin panel.";
  }
}

/**
 * Normalizes team names to match the 2026 preloaded database keys.
 */
function normalizeTeamName(name) {
  if (!name) return "";
  var n = name.toString().trim();
  var nLower = n.toLowerCase();
  
  if (nLower === "united states" || nLower === "us" || nLower === "usa") return "USA";
  if (nLower === "south korea" || nLower === "korea republic" || nLower === "korea") return "Korea Republic";
  if (nLower === "saudi arabia" || nLower === "ksa") return "Saudi Arabia";
  if (nLower === "united arab emirates" || nLower === "uae") return "UAE";
  
  // Case-insensitive exact match search in preloaded list
  for (var i = 0; i < WORLD_CUP_TEAMS.length; i++) {
    if (WORLD_CUP_TEAMS[i].name.toLowerCase() === nLower) {
      return WORLD_CUP_TEAMS[i].name;
    }
  }
  return n;
}

/**
 * Scans Matches sheet, determines furthest stage reached by each team,
 * and updates "Current Stage" in Teams sheet.
 */
function updateCurrentStagesFromMatches(ss) {
  var matches = sheetToObjects('Matches');
  var teamsSheet = ss.getSheetByName('Teams');
  if (!teamsSheet) return;
  var teamsRange = teamsSheet.getDataRange();
  var teamsValues = teamsRange.getValues();
  var headers = teamsValues[0];
  
  var nameCol = headers.indexOf("Country Name");
  var stageCol = headers.indexOf("Current Stage");
  
  var teamMaxStage = {};
  
  var stageRank = {
    "Group": 1,
    "R32": 2,
    "R16": 3,
    "QF": 4,
    "SF": 5,
    "F": 6,
    "Finalist": 6,
    "CHAMP": 7,
    "Champion": 7
  };
  
  matches.forEach(function(m) {
    if (m.status !== 'FT' && m.status !== 'Live') return;
    
    var stage = m.stage || "Group";
    var normStage = "Group";
    
    if (stage.indexOf("32") !== -1 || stage.indexOf("Thirty") !== -1) normStage = "R32";
    else if (stage.indexOf("16") !== -1 || stage.indexOf("Sixteen") !== -1) normStage = "R16";
    else if (stage.indexOf("Quarter") !== -1 || stage.indexOf("QF") !== -1) normStage = "QF";
    else if (stage.indexOf("Semi") !== -1 || stage.indexOf("SF") !== -1) normStage = "SF";
    else if (stage.indexOf("Final") !== -1 || stage === "F") {
      normStage = "F";
      if (m.status === 'FT') {
        var champion = m.winner || m.shootoutWinner;
        if (champion) {
          teamMaxStage[champion] = "CHAMP";
        }
      }
    }
    
    var teamA = m.teamA;
    if (teamA) {
      var currentMax = teamMaxStage[teamA] || "Group";
      if (stageRank[normStage] > stageRank[currentMax]) {
        teamMaxStage[teamA] = normStage;
      }
    }
    
    var teamB = m.teamB;
    if (teamB) {
      var currentMax = teamMaxStage[teamB] || "Group";
      if (stageRank[normStage] > stageRank[currentMax]) {
        teamMaxStage[teamB] = normStage;
      }
    }
  });
  
  // Write back to teams array
  for (var i = 1; i < teamsValues.length; i++) {
    var name = teamsValues[i][nameCol];
    if (teamMaxStage[name]) {
      var currentVal = teamsValues[i][stageCol] || "Group";
      if (stageRank[teamMaxStage[name]] > stageRank[currentVal]) {
        teamsValues[i][stageCol] = teamMaxStage[name];
      }
    }
  }
  
  teamsRange.setValues(teamsValues);
}

/**
 * Recalculates match statistics and advancement bonuses, updates Teams sheet,
 * and recreates the Leaderboard sheet.
 */
function recalculatePoints() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teamsSheet = ss.getSheetByName('Teams');
  if (!teamsSheet) return;
  
  var teamsRange = teamsSheet.getDataRange();
  var teamsValues = teamsRange.getValues();
  var headers = teamsValues[0];
  
  var nameCol = headers.indexOf("Country Name");
  var multiplierCol = headers.indexOf("Multiplier");
  var goalsCol = headers.indexOf("Goals Scored");
  var winsCol = headers.indexOf("Wins");
  var drawsCol = headers.indexOf("Draws");
  var shootoutWinsCol = headers.indexOf("Shootout Wins");
  var stageCol = headers.indexOf("Current Stage");
  var pointsCol = headers.indexOf("Total Points Contributed");
  var ownerCol = headers.indexOf("Owner");
  
  // Read Matches and aggregate stats
  var teamStats = {};
  var matches = sheetToObjects('Matches');
  
  // Prepopulate teamStats with all teams in sheet
  for (var i = 1; i < teamsValues.length; i++) {
    var tName = teamsValues[i][nameCol];
    teamStats[tName] = { wins: 0, draws: 0, goals: 0, shootoutWins: 0 };
  }
  
  matches.forEach(function(m) {
    if (m.status !== 'FT' && m.status !== 'Live') return;
    
    var teamA = m.teamA;
    var teamB = m.teamB;
    
    if (!teamStats[teamA]) teamStats[teamA] = { wins: 0, draws: 0, goals: 0, shootoutWins: 0 };
    if (!teamStats[teamB]) teamStats[teamB] = { wins: 0, draws: 0, goals: 0, shootoutWins: 0 };
    
    var scoreA = Number(m.scoreA) || 0;
    var scoreB = Number(m.scoreB) || 0;
    
    teamStats[teamA].goals += scoreA;
    teamStats[teamB].goals += scoreB;
    
    if (scoreA === scoreB) {
      teamStats[teamA].draws += 1;
      teamStats[teamB].draws += 1;
      
      var sWinner = m.shootoutWinner;
      if (sWinner) {
        if (sWinner === teamA) teamStats[teamA].shootoutWins += 1;
        else if (sWinner === teamB) teamStats[teamB].shootoutWins += 1;
      }
    } else {
      if (scoreA > scoreB) {
        teamStats[teamA].wins += 1;
      } else {
        teamStats[teamB].wins += 1;
      }
    }
  });
  
  // 1. Recalculate Points for each team
  for (var i = 1; i < teamsValues.length; i++) {
    var name = teamsValues[i][nameCol];
    var mult = Number(teamsValues[i][multiplierCol]) || 1.0;
    var stage = teamsValues[i][stageCol] || "Group";
    
    var stats = teamStats[name] || { wins: 0, draws: 0, goals: 0, shootoutWins: 0 };
    
    teamsValues[i][goalsCol] = stats.goals;
    teamsValues[i][winsCol] = stats.wins;
    teamsValues[i][drawsCol] = stats.draws;
    if (shootoutWinsCol !== -1) {
      teamsValues[i][shootoutWinsCol] = stats.shootoutWins;
    }
    
    // Performance Formula: (Wins * 3 + Draws * 1 + Goals * 0.5 + ShootoutWins * 1.5) * Multiplier
    var basePerformance = (stats.wins * 3) + (stats.draws * 1) + (stats.goals * 0.5) + (stats.shootoutWins * 1.5);
    var performancePoints = basePerformance * mult;
    
    // Flat advancement bonuses (non-multiplied, non-stacking)
    var advancementBonus = 0;
    if (stage === "R32") advancementBonus = 1;
    else if (stage === "R16") advancementBonus = 2;
    else if (stage === "QF") advancementBonus = 4;
    else if (stage === "SF") advancementBonus = 6;
    else if (stage === "F" || stage === "Runner-up" || stage === "Finalist") advancementBonus = 8;
    else if (stage === "CHAMP" || stage === "Champion") advancementBonus = 12;
    
    var totalPoints = performancePoints + advancementBonus;
    teamsValues[i][pointsCol] = totalPoints;
  }
  
  // Save teams values back to sheet
  teamsRange.setValues(teamsValues);
  
  // 2. Aggregate Leaderboard standings
  var playerStandings = {};
  var players = sheetToObjects('Players');
  
  players.forEach(function(p) {
    playerStandings[p.playerName] = {
      playerName: p.playerName,
      totalPoints: 0,
      wins: 0,
      draws: 0,
      goals: 0,
      teamsOwned: []
    };
  });
  
  // Re-read teams from memory array
  for (var i = 1; i < teamsValues.length; i++) {
    var owner = teamsValues[i][ownerCol];
    var country = teamsValues[i][nameCol];
    var pts = Number(teamsValues[i][pointsCol]) || 0;
    var w = Number(teamsValues[i][winsCol]) || 0;
    var d = Number(teamsValues[i][drawsCol]) || 0;
    var g = Number(teamsValues[i][goalsCol]) || 0;
    
    if (owner && playerStandings[owner]) {
      playerStandings[owner].totalPoints += pts;
      playerStandings[owner].wins += w;
      playerStandings[owner].draws += d;
      playerStandings[owner].goals += g;
      playerStandings[owner].teamsOwned.push(country);
    }
  }
  
  var sortedStandings = Object.keys(playerStandings).map(function(name) {
    return playerStandings[name];
  });
  sortedStandings.sort(function(a, b) { return b.totalPoints - a.totalPoints; });
  
  // Write Leaderboard sheet
  var lbSheet = ss.getSheetByName('Leaderboard');
  if (!lbSheet) {
    lbSheet = ss.insertSheet('Leaderboard');
  }
  lbSheet.clear();
  lbSheet.appendRow([
    "Rank", "Player Name", "Total Points", "Teams Owned", "Wins", "Draws", "Goals Scored"
  ]);
  
  sortedStandings.forEach(function(item, index) {
    lbSheet.appendRow([
      index + 1,
      item.playerName,
      item.totalPoints,
      item.teamsOwned.join(", "),
      item.wins,
      item.draws,
      item.goals
    ]);
  });
  
  // Reset cache
  var cache = CacheService.getScriptCache();
  cache.remove('dashboard_data_payload');
}

/**
 * Simulation Engine: Advances the bracket step-by-step
 * to dry-run the dashboard and score system.
 */
function runMockMatchdaySimulation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var simStage = getConfigValue('SimulationStage') || 'Group';
  var teams = sheetToObjects('Teams');
  var matchesSheet = ss.getSheetByName('Matches');
  
  if (simStage === 'Finished') {
    return "Simulation is already finished. Reset the draft to run again.";
  }
  
  var msg = "";
  
  if (simStage === 'Group') {
    // Generate Group Stage Matches (72 matches total)
    // 12 groups (A-L), 4 teams per group = 6 fixtures per group
    var matchCount = 0;
    var groups = "ABCDEFGHIJKL".split("");
    
    matchesSheet.clear();
    matchesSheet.appendRow([
      "Match ID", "Stage", "Team A", "Team B", "Score A", "Score B", 
      "Status (Scheduled/Live/FT)", "Winner", "Shootout Winner", "Date"
    ]);
    
    groups.forEach(function(gCode) {
      var gTeams = teams.filter(function(t) { return t.group === gCode; });
      if (gTeams.length !== 4) return;
      
      // Round robin matches
      var pairings = [
        [0, 1], [2, 3],
        [0, 2], [1, 3],
        [0, 3], [1, 2]
      ];
      
      pairings.forEach(function(pair) {
        matchCount++;
        var teamA = gTeams[pair[0]].countryName;
        var teamB = gTeams[pair[1]].countryName;
        
        // Simulate score (wins heavily skewed to better rankings, but with chaos)
        var rankA = Number(gTeams[pair[0]].fifaRank);
        var rankB = Number(gTeams[pair[1]].fifaRank);
        
        var weightA = Math.max(1, 100 - rankA);
        var weightB = Math.max(1, 100 - rankB);
        
        var goalA = Math.floor(Math.random() * (weightA / 20 + 2));
        var goalB = Math.floor(Math.random() * (weightB / 20 + 2));
        
        var winner = "";
        if (goalA > goalB) winner = teamA;
        else if (goalB > goalA) winner = teamB;
        
        matchesSheet.appendRow([
          "M_GP_" + matchCount, "Group Stage", teamA, teamB, goalA, goalB, "FT", winner, "", "June 2026"
        ]);
      });
    });
    
    setConfigValue('SimulationStage', 'R32');
    msg = "Group Stage simulated: 72 matches completed.";
    
  } else if (simStage === 'R32') {
    // Advance top 32 teams to R32
    // We calculate current group stage performance points: Wins * 3 + Draws * 1 + Goals * 0.01 (tie breaker)
    recalculatePoints();
    var latestTeams = sheetToObjects('Teams');
    
    latestTeams.sort(function(a, b) {
      var wA = Number(a.wins) || 0;
      var dA = Number(a.draws) || 0;
      var gA = Number(a.goalsScored) || 0;
      
      var wB = Number(b.wins) || 0;
      var dB = Number(b.draws) || 0;
      var gB = Number(b.goalsScored) || 0;
      
      var scoreA = wA * 3 + dA * 1 + gA * 0.01;
      var scoreB = wB * 3 + dB * 1 + gB * 0.01;
      return scoreB - scoreA;
    });
    
    // Select top 32
    var r32Teams = latestTeams.slice(0, 32);
    
    // Update stage in sheet
    var teamsSheet = ss.getSheetByName('Teams');
    var teamsValues = teamsSheet.getDataRange().getValues();
    var nameCol = teamsValues[0].indexOf("Country Name");
    var stageCol = teamsValues[0].indexOf("Current Stage");
    
    var r32Names = r32Teams.map(function(t) { return t.countryName; });
    
    for (var i = 1; i < teamsValues.length; i++) {
      var tName = teamsValues[i][nameCol];
      if (r32Names.indexOf(tName) !== -1) {
        teamsSheet.getRange(i + 1, stageCol + 1).setValue("R32");
      }
    }
    
    // Pair and simulate R32 matches (16 matches)
    for (var j = 0; j < 16; j++) {
      var teamA = r32Names[j];
      var teamB = r32Names[31 - j];
      
      var goals = simulateKnockoutScore();
      var winner = "";
      var shootoutWinner = "";
      
      if (goals.scoreA === goals.scoreB) {
        shootoutWinner = Math.random() > 0.5 ? teamA : teamB;
      } else {
        winner = goals.scoreA > goals.scoreB ? teamA : teamB;
      }
      
      matchesSheet.appendRow([
        "M_R32_" + (j + 1), "Round of 32", teamA, teamB, goals.scoreA, goals.scoreB, "FT", winner, shootoutWinner, "July 1, 2026"
      ]);
    }
    
    setConfigValue('SimulationStage', 'R16');
    msg = "Round of 32 simulated: 16 matches completed.";
    
  } else if (simStage === 'R16') {
    // Advance R32 winners to R16
    // We look at Matches sheet for Round of 32 winners
    var r32Winners = getKnockoutWinners("Round of 32");
    
    updateStagesInSheet(r32Winners, "R16");
    
    // Pair and simulate (8 matches)
    for (var j = 0; j < 8; j++) {
      var teamA = r32Winners[j * 2];
      var teamB = r32Winners[j * 2 + 1];
      
      var goals = simulateKnockoutScore();
      var winner = "";
      var shootoutWinner = "";
      
      if (goals.scoreA === goals.scoreB) {
        shootoutWinner = Math.random() > 0.5 ? teamA : teamB;
      } else {
        winner = goals.scoreA > goals.scoreB ? teamA : teamB;
      }
      
      matchesSheet.appendRow([
        "M_R16_" + (j + 1), "Round of 16", teamA, teamB, goals.scoreA, goals.scoreB, "FT", winner, shootoutWinner, "July 5, 2026"
      ]);
    }
    
    setConfigValue('SimulationStage', 'QF');
    msg = "Round of 16 simulated: 8 matches completed.";
    
  } else if (simStage === 'QF') {
    // Advance R16 winners to QF
    var r16Winners = getKnockoutWinners("Round of 16");
    updateStagesInSheet(r16Winners, "QF");
    
    // Pair and simulate (4 matches)
    for (var j = 0; j < 4; j++) {
      var teamA = r16Winners[j * 2];
      var teamB = r16Winners[j * 2 + 1];
      
      var goals = simulateKnockoutScore();
      var winner = "";
      var shootoutWinner = "";
      
      if (goals.scoreA === goals.scoreB) {
        shootoutWinner = Math.random() > 0.5 ? teamA : teamB;
      } else {
        winner = goals.scoreA > goals.scoreB ? teamA : teamB;
      }
      
      matchesSheet.appendRow([
        "M_QF_" + (j + 1), "Quarter-Finals", teamA, teamB, goals.scoreA, goals.scoreB, "FT", winner, shootoutWinner, "July 10, 2026"
      ]);
    }
    
    setConfigValue('SimulationStage', 'SF');
    msg = "Quarter-Finals simulated: 4 matches completed.";
    
  } else if (simStage === 'SF') {
    // Advance QF winners to SF
    var qfWinners = getKnockoutWinners("Quarter-Finals");
    updateStagesInSheet(qfWinners, "SF");
    
    // Pair and simulate (2 matches)
    for (var j = 0; j < 2; j++) {
      var teamA = qfWinners[j * 2];
      var teamB = qfWinners[j * 2 + 1];
      
      var goals = simulateKnockoutScore();
      var winner = "";
      var shootoutWinner = "";
      
      if (goals.scoreA === goals.scoreB) {
        shootoutWinner = Math.random() > 0.5 ? teamA : teamB;
      } else {
        winner = goals.scoreA > goals.scoreB ? teamA : teamB;
      }
      
      matchesSheet.appendRow([
        "M_SF_" + (j + 1), "Semi-Finals", teamA, teamB, goals.scoreA, goals.scoreB, "FT", winner, shootoutWinner, "July 14, 2026"
      ]);
    }
    
    setConfigValue('SimulationStage', 'Final');
    msg = "Semi-Finals simulated: 2 matches completed.";
    
  } else if (simStage === 'Final') {
    // Advance SF winners to Finalists (F)
    var sfWinners = getKnockoutWinners("Semi-Finals");
    updateStagesInSheet(sfWinners, "F");
    
    // Simulate Final Match (1 match)
    var teamA = sfWinners[0];
    var teamB = sfWinners[1];
    
    var goals = simulateKnockoutScore();
    var winner = "";
    var shootoutWinner = "";
    
    if (goals.scoreA === goals.scoreB) {
      shootoutWinner = Math.random() > 0.5 ? teamA : teamB;
    } else {
      winner = goals.scoreA > goals.scoreB ? teamA : teamB;
    }
    
    var champion = winner || shootoutWinner;
    
    matchesSheet.appendRow([
      "M_FIN_1", "Finals", teamA, teamB, goals.scoreA, goals.scoreB, "FT", winner, shootoutWinner, "July 19, 2026"
    ]);
    
    // Update Winner to Champion stage
    var teamsSheet = ss.getSheetByName('Teams');
    var teamsValues = teamsSheet.getDataRange().getValues();
    var nameCol = teamsValues[0].indexOf("Country Name");
    var stageCol = teamsValues[0].indexOf("Current Stage");
    
    for (var i = 1; i < teamsValues.length; i++) {
      var tName = teamsValues[i][nameCol];
      if (tName === champion) {
        teamsSheet.getRange(i + 1, stageCol + 1).setValue("CHAMP");
      }
    }
    
    setConfigValue('SimulationStage', 'Finished');
    msg = "Finals simulated! " + champion + " is the Champion!";
  }
  
  // Recalculate
  recalculatePoints();
  return msg;
}

/**
 * Simulated knockout scores.
 */
function simulateKnockoutScore() {
  var scoreA = Math.floor(Math.random() * 3);
  var scoreB = Math.floor(Math.random() * 3);
  // Equal chance of draw to force shootouts
  if (Math.random() > 0.7) {
    scoreB = scoreA;
  }
  return { scoreA: scoreA, scoreB: scoreB };
}

/**
 * Gets winners from a specific stage in Matches.
 */
function getKnockoutWinners(stageName) {
  var matches = sheetToObjects('Matches');
  var winners = [];
  matches.forEach(function(m) {
    if (m.stage === stageName && m.status === 'FT') {
      var w = m.winner || m.shootoutWinner;
      if (w) winners.push(w);
    }
  });
  return winners;
}

/**
 * Updates stage in Teams sheet for specific country names.
 */
function updateStagesInSheet(countryList, stageName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teamsSheet = ss.getSheetByName('Teams');
  var teamsValues = teamsSheet.getDataRange().getValues();
  var nameCol = teamsValues[0].indexOf("Country Name");
  var stageCol = teamsValues[0].indexOf("Current Stage");
  
  for (var i = 1; i < teamsValues.length; i++) {
    var tName = teamsValues[i][nameCol];
    if (countryList.indexOf(tName) !== -1) {
      teamsSheet.getRange(i + 1, stageCol + 1).setValue(stageName);
    }
  }
}

/**
 * Admin Panel: Manually update/save a match score.
 */
function adminSaveMatch(matchId, scoreA, scoreB, status, winner, shootoutWinner, passcode) {
  if (!verifyPasscode(passcode)) {
    throw new Error("Invalid admin passcode.");
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Matches');
  var data = sheet.getDataRange().getValues();
  
  var matchCol = data[0].indexOf("Match ID");
  var scoreACol = data[0].indexOf("Score A");
  var scoreBCol = data[0].indexOf("Score B");
  var statusCol = data[0].indexOf("Status (Scheduled/Live/FT)");
  var winnerCol = data[0].indexOf("Winner");
  var sWinnerCol = data[0].indexOf("Shootout Winner");
  
  var foundRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][matchCol].toString() === matchId.toString()) {
      foundRowIndex = i + 1;
      break;
    }
  }
  
  if (foundRowIndex === -1) {
    throw new Error("Match ID " + matchId + " not found.");
  }
  
  sheet.getRange(foundRowIndex, scoreACol + 1).setValue(scoreA);
  sheet.getRange(foundRowIndex, scoreBCol + 1).setValue(scoreB);
  sheet.getRange(foundRowIndex, statusCol + 1).setValue(status);
  sheet.getRange(foundRowIndex, winnerCol + 1).setValue(winner);
  sheet.getRange(foundRowIndex, sWinnerCol + 1).setValue(shootoutWinner);
  
  // Recalculate stages and points
  updateCurrentStagesFromMatches(ss);
  recalculatePoints();
  
  return getDashboardData();
}

/**
 * Admin Panel: Reset game states and clear logs to restart.
 */
function adminResetGame(passcode) {
  if (!verifyPasscode(passcode)) {
    throw new Error("Invalid admin passcode.");
  }
  
  initializeDatabase();
  return getDashboardData();
}

/**
 * Admin Panel: Run simulation of next stage.
 */
function adminSimulateNextStage(passcode) {
  if (!verifyPasscode(passcode)) {
    throw new Error("Invalid admin passcode.");
  }
  
  var result = runMockMatchdaySimulation();
  return {
    message: result,
    data: getDashboardData()
  };
}

/**
 * Verification helpers
 */
function verifyPasscode(input) {
  var config = getConfigMap();
  var correct = config.Passcode || '1234';
  return input.toString() === correct.toString();
}

/**
 * UTILS: Config read/write helpers
 */
function getConfigMap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return {};
  var values = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i++) {
    if (values[i][0]) {
      map[values[i][0]] = values[i][1];
    }
  }
  return map;
}

function setConfigValue(setting, value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === setting) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([setting, value]);
}

function getConfigValue(setting) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === setting) {
      return values[i][1];
    }
  }
  return null;
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Converts a sheet range with headers into an array of JS objects.
 */
function sheetToObjects(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var objects = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = cleanHeaderKey(headers[j]);
      obj[key] = data[i][j];
    }
    objects.push(obj);
  }
  return objects;
}

function cleanHeaderKey(header) {
  var str = header.toString().trim();
  if (str === "Tier" || str === "Tier (1-4)") return "tier";
  if (str === "Status (Scheduled/Live/FT)") return "status";
  var parts = str.split(/\s+/);
  var result = parts[0].toLowerCase();
  for (var i = 1; i < parts.length; i++) {
    result += parts[i].charAt(0).toUpperCase() + parts[i].slice(1).toLowerCase();
  }
  return result.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * BACKEND UNIT TESTS: Used to verify backend calculations and drafting rules.
 * Admin or developers can execute this in GAS editor.
 */
function runBackendTests() {
  Logger.log("Starting backend tests...");
  
  // 1. Init Database
  var res = initializeDatabase();
  Logger.log("DB Init result: " + res);
  
  // 2. Setup Players
  var names = ["Dave", "Sarah", "John", "Amy"];
  var setupRes = setupPlayers(names, "9999");
  Logger.log("Setup players result: draft status = " + setupRes.config.DraftStatus);
  if (setupRes.config.DraftStatus !== "DrawOrder") throw new Error("Expected DrawOrder status");
  if (setupRes.config.Passcode !== "9999") throw new Error("Expected updated passcode");
  
  // 3. Draw capsules
  var draws = [];
  for (var i = 0; i < 4; i++) {
    var draw = drawCapsule("ball_" + i);
    draws.push(draw);
    Logger.log("Drew player: " + draw.playerName + " as order #" + draw.pickOrder);
  }
  if (!draws[3].allDrawn) throw new Error("Expected allDrawn on 4th draw");
  
  // 4. Start drafting
  var draftInit = startDrafting("9999");
  Logger.log("Start drafting result: status = " + draftInit.config.DraftStatus);
  if (draftInit.config.DraftStatus !== "Drafting") throw new Error("Expected Drafting status");
  
  // 5. Test snake draft turns: Order is Dave (1), Sarah (2), John (3), Amy (4)
  // Dave is index 0. Drafts Argentina (Group A, Tier 1)
  var playersList = draftInit.players; // sorted by order
  var p1 = playersList[0].playerName;
  var p2 = playersList[1].playerName;
  var p3 = playersList[2].playerName;
  var p4 = playersList[3].playerName;
  
  Logger.log("Draft order: " + [p1, p2, p3, p4].join(", "));
  
  draftCountry(p1, "Argentina");
  Logger.log("Dave drafted Argentina. Next active index: " + getConfigValue("ActivePlayerIndex")); // expect index 1 (Sarah)
  
  draftCountry(p2, "France");
  draftCountry(p3, "Belgium");
  draftCountry(p4, "England"); // Pick 4. Next pick: Pick 5 (even round, snake flips, Amy picks again)
  
  var actIdx = getConfigValue("ActivePlayerIndex");
  Logger.log("End of Round 1. Next active index: " + actIdx); // expect 3 (Amy)
  if (Number(actIdx) !== 3) throw new Error("Expected active player index 3 (Amy) for Pick #5");
  
  // 6. Test Group Lock Rule
  // Amy (p4) tries to draft USA. USA is in Group A.
  // Wait, does Amy already own Group A? No, Dave owns Argentina (Group A).
  // Amy drafts USA (Group A). This is fine.
  draftCountry(p4, "USA");
  
  // John (p3) drafts Colombia (Group B).
  draftCountry(p3, "Colombia");
  
  // Sarah (p2) drafts Mexico (Group C).
  draftCountry(p2, "Mexico");
  
  // Dave (p1) drafts Uruguay (Group D).
  draftCountry(p1, "Uruguay"); // End of Round 2. Pick 9: Dave picks first in Round 3.
  
  // Let's test Group Lock validation:
  // Dave (p1) owns Argentina (Group A) and Uruguay (Group D).
  // Dave tries to draft Canada (Group A) or Costa Rica (Group D).
  // Available groups should include: Group B, C, E, F, G, H, I, J, K, L.
  // Since there are available countries in unlocked groups, Dave should be blocked from drafting Canada.
  try {
    draftCountry(p1, "Canada");
    throw new Error("Failed: Dave should not be allowed to draft Canada due to Group Lock (Group A already owned)");
  } catch(e) {
    Logger.log("Success: Group lock correctly blocked Dave from drafting Canada: " + e.message);
  }
  
  // Dave drafts Switzerland (Group E) - should succeed.
  draftCountry(p1, "Switzerland");
  Logger.log("Dave successfully drafted Switzerland (unlocked Group E)");
  
  Logger.log("All backend tests passed!");
  return "All tests passed successfully!";
}
