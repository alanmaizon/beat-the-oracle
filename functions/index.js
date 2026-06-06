"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { mapTeamNameToCode } = require("./nameMap");
const { GROUPS, TEAMS_MAP } = require("./groupsData");

admin.initializeApp();
const db = admin.firestore();

// Define secrets (for deployment configure these via Firebase CLI or Google Cloud Secret Manager)
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const footballDataApiKey = defineSecret("FOOTBALL_DATA_API_KEY");

// ===== ELO ENGINE =====
const HOST_BONUS = 60;
const eff = (t) => t.elo + (t.host ? HOST_BONUS : 0);
const winProb = (a, b) => 1 / (1 + Math.pow(10, (eff(b) - eff(a)) / 400));
const playMatch = (a, b) => (winProb(a, b) >= 0.5 ? a : b); // Oracle is deterministic favorite-picker

// deterministic group resolver for seeding/oracle
function getOracleGroupQualifiers() {
  const winners = [];
  const runners = [];
  const thirds = [];

  Object.keys(GROUPS).forEach((k) => {
    // Sort group teams by Elo (deterministic)
    const sorted = GROUPS[k].slice().sort((a, b) => eff(b) - eff(a));
    winners.push(sorted[0]);
    runners.push(sorted[1]);
    thirds.push(sorted[2]);
  });

  // Best 8 thirds by Elo
  thirds.sort((a, b) => eff(b) - eff(a));
  const top8Thirds = thirds.slice(0, 8);

  return winners.concat(runners, top8Thirds);
}

// bracket seeder
function seedBracket(teams) {
  const s = teams.slice().sort((a, b) => eff(b) - eff(a));
  const o = [];
  for (let i = 0; i < s.length / 2; i++) {
    o.push(s[i]);
    o.push(s[s.length - 1 - i]);
  }
  return o;
}

// Monte Carlo simulator for title odds
function runMonteCarlo(runs) {
  const tally = {};
  Object.keys(GROUPS).forEach((k) => {
    GROUPS[k].forEach((t) => {
      tally[t.code] = 0;
    });
  });

  const playMatchStochastic = (a, b) => {
    return Math.random() < winProb(a, b) ? a : b;
  };

  const simGroupStochastic = (teams) => {
    const tbl = teams.map((t) => ({ t, pts: 0, gd: 0 }));
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const a = teams[i];
        const b = teams[j];
        const pa = winProb(a, b);
        const r = Math.random();
        if (r < pa - 0.14) {
          tbl.find((x) => x.t.code === a.code).pts += 3;
          tbl.find((x) => x.t.code === a.code).gd += 1;
          tbl.find((x) => x.t.code === b.code).gd -= 1;
        } else if (r > pa + 0.14) {
          tbl.find((x) => x.t.code === b.code).pts += 3;
          tbl.find((x) => x.t.code === b.code).gd += 1;
          tbl.find((x) => x.t.code === a.code).gd -= 1;
        } else {
          tbl.find((x) => x.t.code === a.code).pts += 1;
          tbl.find((x) => x.t.code === b.code).pts += 1;
        }
      }
    }
    tbl.sort((x, y) => y.pts - x.pts || y.gd - x.gd || eff(y.t) - eff(x.t));
    return tbl;
  };

  const getQualifiersStochastic = () => {
    const winners = [];
    const runners = [];
    const thirds = [];
    Object.keys(GROUPS).forEach((k) => {
      const s = simGroupStochastic(GROUPS[k]);
      winners.push(s[0].t);
      runners.push(s[1].t);
      thirds.push({ t: s[2].t, pts: s[2].pts, gd: s[2].gd });
    });
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || eff(b.t) - eff(a.t));
    return winners.concat(runners, thirds.slice(0, 8).map((x) => x.t));
  };

  for (let r = 0; r < runs; r++) {
    let pool = seedBracket(getQualifiersStochastic());
    while (pool.length > 1) {
      const nextRound = [];
      for (let i = 0; i < pool.length; i += 2) {
        nextRound.push(playMatchStochastic(pool[i], pool[i + 1]));
      }
      pool = nextRound;
    }
    tally[pool[0].code]++;
  }

  const all = [];
  Object.keys(GROUPS).forEach((k) => {
    GROUPS[k].forEach((t) => {
      all.push({ code: t.code, p: tally[t.code] / runs });
    });
  });
  return all.sort((a, b) => b.p - a.p);
}

// ===== 1. SEED DATABASE FUNCTION =====
exports.seedDatabase = onRequest({ cors: true }, async (req, res) => {
  try {
    const batch = db.batch();

    // 1. Seed teams
    Object.keys(GROUPS).forEach((k) => {
      GROUPS[k].forEach((t) => {
        const ref = db.collection("teams").doc(t.code);
        batch.set(ref, t);
      });
    });

    // 2. Seed tournament config
    const configRef = db.collection("config").doc("tournament");
    batch.set(configRef, {
      lockAt: "2026-06-11T20:30:00Z", // First kickoff time
      stage: "pre",
      locked: false,
    });

    // 3. Compute Oracle prediction bracket
    const oracleGroupPicks = {};
    Object.keys(GROUPS).forEach((k) => {
      const sorted = GROUPS[k].slice().sort((a, b) => eff(b) - eff(a));
      oracleGroupPicks[k] = [sorted[0].code, sorted[1].code];
    });

    const oracleQualifiers = getOracleGroupQualifiers();
    const koBracket = [];
    const oracleKoPicks = {
      r32: {},
      r16: {},
      qf: {},
      sf: {},
      final: {},
    };

    // Simulate R32
    let pool = seedBracket(oracleQualifiers);
    const r32Teams = [];
    for (let i = 0; i < pool.length; i += 2) {
      const winner = playMatch(pool[i], pool[i + 1]);
      const matchId = `m${i / 2}`;
      oracleKoPicks.r32[matchId] = winner.code;
      r32Teams.push(winner);
    }

    // Simulate R16
    const r16Teams = [];
    for (let i = 0; i < r32Teams.length; i += 2) {
      const winner = playMatch(r32Teams[i], r32Teams[i + 1]);
      const matchId = `m${i / 2}`;
      oracleKoPicks.r16[matchId] = winner.code;
      r16Teams.push(winner);
    }

    // Simulate QF
    const qfTeams = [];
    for (let i = 0; i < r16Teams.length; i += 2) {
      const winner = playMatch(r16Teams[i], r16Teams[i + 1]);
      const matchId = `m${i / 2}`;
      oracleKoPicks.qf[matchId] = winner.code;
      qfTeams.push(winner);
    }

    // Simulate SF
    const sfTeams = [];
    for (let i = 0; i < qfTeams.length; i += 2) {
      const winner = playMatch(qfTeams[i], qfTeams[i + 1]);
      const matchId = `m${i / 2}`;
      oracleKoPicks.sf[matchId] = winner.code;
      sfTeams.push(winner);
    }

    // Simulate Final
    const champion = playMatch(sfTeams[0], sfTeams[1]);
    oracleKoPicks.final["m0"] = champion.code;

    // 4. Run Monte Carlo for Title Odds
    const odds = runMonteCarlo(5000);

    const oracleCurrentRef = db.collection("oracle").doc("current");
    batch.set(oracleCurrentRef, {
      groupPicks: oracleGroupPicks,
      koPicks: oracleKoPicks,
      predictedChampion: champion.code,
      titleOdds: odds,
      generatedAt: new Date().toISOString(),
    });

    // 5. Initialize Leaderboard meta
    const leaderboardRef = db.collection("meta").doc("leaderboard");
    batch.set(leaderboardRef, {
      topN: [],
      oracleTotal: 0,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();
    res.status(200).send({ success: true, message: "Database seeded successfully." });
  } catch (error) {
    console.error("Error seeding database:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// ===== 2. GEMINI SCOUTING CLOUD FUNCTION =====
exports.scouting = onRequest({ cors: true, secrets: [geminiApiKey] }, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send({ error: "Only POST requests are allowed." });
    return;
  }

  const { teamCode } = req.body;
  if (!teamCode || !/^[A-Z]{2}$/.test(teamCode)) {
    res.status(400).send({ error: "Valid ISO teamCode (2-letter uppercase) is required." });
    return;
  }

  const team = TEAMS_MAP[teamCode];
  if (!team) {
    res.status(404).send({ error: `Team with code ${teamCode} not found.` });
    return;
  }

  try {
    // 1. Check cache in Firestore
    const cacheRef = db.collection("scouting").doc(teamCode);
    const cacheDoc = await cacheRef.get();

    if (cacheDoc.exists) {
      const data = cacheDoc.data();
      if (data.report) {
        res.status(200).send({ report: data.report, cached: true });
        return;
      }
    }

    // 2. Fetch from Gemini API
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `One punchy sentence of World Cup scouting for ${team.name}. Elo ${team.elo}, confederation ${team.conf}, all-time record ${team.wins}W-${team.draws}D-${team.losses}L, goals for ${team.gf}, goals against ${team.ga}. No preamble.`;

    let report = "";
    try {
      // Try Gemini 3.5 Flash first
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash", temperature: 0.3 });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      report = response.text().trim();
    } catch (e) {
      console.warn("Failed with gemini-3.5-flash, trying gemini-1.5-flash...", e);
      try {
        const modelFallback = genAI.getGenerativeModel({ model: "gemini-1.5-flash", temperature: 0.3 });
        const result = await modelFallback.generateContent(prompt);
        const response = await result.response;
        report = response.text().trim();
      } catch (innerError) {
        console.error("Gemini API error:", innerError);
        throw innerError; // triggers fallback to deterministic report
      }
    }

    // 3. Cache report in Firestore
    await cacheRef.set({
      report,
      generatedAt: new Date().toISOString(),
    });

    res.status(200).send({ report, cached: false });
  } catch (error) {
    console.error(`Error generating scouting report for ${team.name}, falling back:`, error);
    // Graceful fallback to deterministic report
    const wr = team.wins / (team.wins + team.draws + team.losses);
    const gd = team.gf - team.ga;
    const tier = team.elo >= 2000 ? "a heavyweight" : team.elo >= 1850 ? "a real contender" : team.elo >= 1700 ? "a live underdog" : "a long shot";
    const form = wr > 0.55 ? "battle-hardened" : wr > 0.45 ? "streaky but dangerous" : "prone to wobbles";
    const atk = gd > 800 ? "ruthless up front" : gd > 200 ? "efficient going forward" : "built on grinding results";
    const conf = { UEFA: "European steel", CONMEBOL: "South American flair", AFC: "Asian tempo", CAF: "African pace", CONCACAF: "home-continent grit", OFC: "Oceanian heart" }[team.conf] || "";
    const fallbackReport = `${team.name}: ${tier}, ${form}, ${atk} — ${conf} (Elo ${team.elo}).`;

    res.status(200).send({ report: fallbackReport, cached: false, fallback: true });
  }
});

// ===== 3. RESULTS INGESTION =====
async function ingestMatchesLogic(apiKeyVal) {
  // Free tier token
  const headers = apiKeyVal ? { "X-Auth-Token": apiKeyVal } : {};

  // Fetch from football-data.org (pluggable: fetchFinishedMatches adapter)
  // WC matches endpoint. V4 uses /v4/competitions/WC/matches
  const url = "https://api.football-data.org/v4/competitions/WC/matches";
  const res = await fetch(url, { headers });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch from football-data.org. HTTP status: ${res.status}`);
  }

  const data = await res.json();
  if (!data || !data.matches) {
    throw new Error("Invalid response from football-data.org.");
  }

  const finishedMatches = data.matches.filter(m => m.status === "FINISHED");
  let upsertedCount = 0;
  const batch = db.batch();

  for (const match of finishedMatches) {
    const homeName = match.homeTeam.name;
    const awayName = match.awayTeam.name;
    const homeCode = mapTeamNameToCode(homeName);
    const awayCode = mapTeamNameToCode(awayName);

    if (!homeCode || !awayCode) {
      console.warn(`Skipping match ID ${match.id}: unable to map home "${homeName}" (${homeCode}) or away "${awayName}" (${awayCode})`);
      continue;
    }

    // Map stages: GROUP_STAGE -> group, LAST_32 -> r32, LAST_16 -> r16, QUARTER_FINALS -> qf, SEMI_FINALS -> sf, FINAL -> final
    let stage = "group";
    if (match.stage === "LAST_32") stage = "r32";
    else if (match.stage === "LAST_16") stage = "r16";
    else if (match.stage === "QUARTER_FINALS") stage = "qf";
    else if (match.stage === "SEMI_FINALS") stage = "sf";
    else if (match.stage === "FINAL") stage = "final";

    // Determine winner code
    let winnerCode = "DRAW";
    if (match.score.winner === "HOME_TEAM") {
      winnerCode = homeCode;
    } else if (match.score.winner === "AWAY_TEAM") {
      winnerCode = awayCode;
    }

    const matchRef = db.collection("results").doc(match.id.toString());
    batch.set(matchRef, {
      stage,
      home: homeCode,
      away: awayCode,
      homeGoals: match.score.fullTime.home,
      awayGoals: match.score.fullTime.away,
      winnerCode,
      status: "finished",
      utcDate: match.utcDate
    });
    upsertedCount++;
  }

  if (upsertedCount > 0) {
    await batch.commit();
  }

  return upsertedCount;
}

exports.ingestResults = onRequest({ secrets: [footballDataApiKey] }, async (req, res) => {
  try {
    const count = await ingestMatchesLogic(footballDataApiKey.value());
    res.status(200).send({ success: true, count, message: `Ingested ${count} matches.` });
  } catch (error) {
    console.error("Error in ingestResults:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

exports.scheduledIngest = onSchedule({
  schedule: "every 30 minutes",
  secrets: [footballDataApiKey]
}, async (event) => {
  try {
    const count = await ingestMatchesLogic(footballDataApiKey.value());
    console.log(`Scheduled ingestion completed. Ingested ${count} matches.`);
    
    // Auto-trigger scoring after successful results sync
    if (count > 0) {
      await scoringLogic();
      console.log("Auto-scoring update completed.");
    }
  } catch (error) {
    console.error("Scheduled ingestion failed:", error);
  }
});

// ===== 4. SCORING & LEADERBOARD RECOMPUTATION =====
async function scoringLogic() {
  // 1. Load tournament config
  const configDoc = await db.collection("config").doc("tournament").get();
  const config = configDoc.exists ? configDoc.data() : { stage: "pre" };

  // 2. Fetch all real results
  const resultsSnap = await db.collection("results").get();
  const results = [];
  resultsSnap.forEach(doc => {
    results.push({ id: doc.id, ...doc.data() });
  });

  // Calculate real qualified teams from group stage results
  // For safety, if we don't have all real group results finished yet in Firestore,
  // we compute the qualified teams from whatever finished group results we have,
  // but let's do a complete ranking.
  // Group results can tell us who qualifies:
  const groupMatches = results.filter(r => r.stage === "group");
  const realGroupStandings = {};
  
  // Initialize group stand table
  Object.keys(GROUPS).forEach(g => {
    realGroupStandings[g] = GROUPS[g].map(team => ({
      code: team.code,
      pts: 0,
      gd: 0,
      gf: 0,
      team
    }));
  });

  // Fill standings
  groupMatches.forEach(m => {
    // Find groups of the teams
    let grp = null;
    let homeIdx = -1, awayIdx = -1;
    
    for (const g of Object.keys(GROUPS)) {
      homeIdx = realGroupStandings[g].findIndex(x => x.code === m.home);
      awayIdx = realGroupStandings[g].findIndex(x => x.code === m.away);
      if (homeIdx >= 0) {
        grp = g;
        break;
      }
    }

    if (grp) {
      const homeTeam = realGroupStandings[grp][homeIdx];
      const awayTeam = realGroupStandings[grp][awayIdx];

      homeTeam.gf += m.homeGoals || 0;
      homeTeam.ga = (homeTeam.ga || 0) + (m.awayGoals || 0);
      awayTeam.gf += m.awayGoals || 0;
      awayTeam.ga = (awayTeam.ga || 0) + (m.homeGoals || 0);

      const hg = m.homeGoals || 0;
      const ag = m.awayGoals || 0;

      if (hg > ag) {
        homeTeam.pts += 3;
      } else if (ag > hg) {
        awayTeam.pts += 3;
      } else {
        homeTeam.pts += 1;
        awayTeam.pts += 1;
      }
    }
  });

  // Compute final qualifiers
  const realQualifiers = [];
  const thirds = [];

  Object.keys(realGroupStandings).forEach(g => {
    const table = realGroupStandings[g];
    table.forEach(row => {
      row.gd = row.gf - (row.ga || 0);
    });
    // Sort
    table.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || eff(y.team) - eff(x.team));
    
    // Top 2 qualify
    if (table[0]) realQualifiers.push(table[0].code);
    if (table[1]) realQualifiers.push(table[1].code);
    if (table[2]) thirds.push({ code: table[2].code, pts: table[2].pts, gd: table[2].gd, gf: table[2].gf, team: table[2].team });
  });

  // Best 8 thirds
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || eff(b.team) - eff(a.team));
  const activeThirdsCount = Math.min(thirds.length, 8);
  for (let i = 0; i < activeThirdsCount; i++) {
    realQualifiers.push(thirds[i].code);
  }

  // Load Oracle predictions
  const oracleDoc = await db.collection("oracle").doc("current").get();
  const oracleData = oracleDoc.exists ? oracleDoc.data() : { groupPicks: {}, koPicks: {} };

  // Helper to check if a knockout match is an upset and if the Oracle missed it
  // Matchup favorites are decided by Elo from the TEAMS_MAP
  function getKnockoutUpsetWinner(realWinnerCode, homeCode, awayCode) {
    if (realWinnerCode === "DRAW" || !realWinnerCode) return null;
    const homeTeam = TEAMS_MAP[homeCode];
    const awayTeam = TEAMS_MAP[awayCode];
    if (!homeTeam || !awayTeam) return null;

    const fav = eff(homeTeam) >= eff(awayTeam) ? homeCode : awayCode;
    const dog = eff(homeTeam) >= eff(awayTeam) ? awayCode : homeCode;

    if (realWinnerCode === dog) {
      return { dog, fav }; // Underdog won (upset!)
    }
    return null;
  }

  // Compute results map for quick lookup
  // Keep key as stage_home_away or stage_matchId
  const resultsByStageAndTeams = {};
  const resultsByStageAndMatchId = {};
  results.forEach(m => {
    resultsByStageAndTeams[`${m.stage}_${m.home}_${m.away}`] = m;
    resultsByStageAndTeams[`${m.stage}_${m.away}_${m.home}`] = m;
    resultsByStageAndMatchId[`${m.stage}_${m.id}`] = m;
  });

  // 3. Recompute Oracle Total Score
  let oracleScore = 0;
  // Oracle Group qualifier points
  Object.keys(GROUPS).forEach(g => {
    const picks = oracleData.groupPicks[g] || [];
    picks.forEach(p => {
      if (realQualifiers.includes(p)) {
        oracleScore += 10;
      }
    });
  });

  // Oracle Knockout points
  const koStages = ["r32", "r16", "qf", "sf", "final"];
  koStages.forEach(stage => {
    const picks = oracleData.koPicks[stage] || {};
    Object.keys(picks).forEach(matchId => {
      const oraclePick = picks[matchId];
      // Find the corresponding real match
      // In the real tournament, we look up real match results for that stage.
      // If the Oracle's predicted winner for this slot actually won in the real results of this stage, Oracle gets +10 points.
      // Wait, how do we match a bracket slot to a real match?
      // For r32: there are 16 matches. In our bracket seeding they are slots m0..m15.
      // In football-data.org, real matches also have stages.
      // Let's look up by stage and winner code. If the Oracle's predicted team won ANY match in this stage, they get points!
      // Wait, is that it? Yes! In a knockout round, if your predicted team wins their match in that stage, you get 10 points!
      // Let's verify: does a team only play one match per stage?
      // Yes! In any single knockout stage, a team can play at most 1 match.
      // So if the team won a match in that stage, they won their knockout matchup!
      // This is an incredibly robust way to check: "Did the predicted team win in this stage?"
      const realStageMatches = results.filter(r => r.stage === stage);
      const wonMatchInStage = realStageMatches.find(r => r.winnerCode === oraclePick);
      if (wonMatchInStage) {
        oracleScore += 10;
      }
    });
  });

  // 4. Fetch all user predictions
  const predictionsSnap = await db.collection("predictions").get();
  const userScores = [];

  const batch = db.batch();

  for (const predDoc of predictionsSnap.docs) {
    const uid = predDoc.id;
    const pred = predDoc.data();
    
    let points = 0;
    let defiance = 0;
    let correctPicks = 0;
    let totalPicks = 0;

    // A. Group Stage Scoring
    Object.keys(GROUPS).forEach(g => {
      const picks = pred.groupPicks[g] || [];
      const oraclePicks = oracleData.groupPicks[g] || [];
      
      picks.forEach(p => {
        totalPicks++;
        if (realQualifiers.includes(p)) {
          points += 10;
          correctPicks++;

          // Defiance: user chose it, team qualified, and Oracle did NOT pick it
          if (!oraclePicks.includes(p)) {
            defiance += 20;
          }
        }
      });
    });

    // B. Knockout Stages Scoring
    koStages.forEach(stage => {
      const picks = pred.koPicks[stage] || {};
      const oraclePicks = oracleData.koPicks[stage] || {};

      Object.keys(picks).forEach(matchId => {
        const userPick = picks[matchId];
        totalPicks++;

        // Find the match in the real results for this stage where this team played
        const realStageMatches = results.filter(r => r.stage === stage);
        const matchPlayed = realStageMatches.find(r => r.home === userPick || r.away === userPick);

        if (matchPlayed && matchPlayed.winnerCode === userPick) {
          points += 10;
          correctPicks++;

          // Defiance: user called an upset the Oracle missed
          // We check if this match was an upset (underdog won) and if the Oracle missed it (Oracle picked the favorite)
          const upset = getKnockoutUpsetWinner(matchPlayed.winnerCode, matchPlayed.home, matchPlayed.away);
          if (upset) {
            // Did Oracle pick the favorite in this stage?
            // In the Oracle's koPicks for this stage, did the Oracle pick the favorite code?
            // If the Oracle's picks did not contain the underdog (which is the userPick), the Oracle missed it.
            // Since Oracle is a favorite-picker, it would never pick the underdog, so indeed Oracle missed it.
            const oraclePickedUnderdog = Object.values(oraclePicks).includes(userPick);
            if (!oraclePickedUnderdog) {
              defiance += 25;
            }
          }
        }
      });
    });

    const total = points + defiance;
    const accuracy = totalPicks > 0 ? (correctPicks / totalPicks) * 100 : 0;

    const scoreRef = db.collection("scores").doc(uid);
    batch.set(scoreRef, {
      points,
      defiance,
      total,
      correctPicks,
      accuracy,
      updatedAt: new Date().toISOString()
    });

    // Fetch user profile info
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : { displayName: "Player", photoURL: "" };

    userScores.push({
      uid,
      displayName: userData.displayName || "Anonymous Player",
      photoURL: userData.photoURL || "",
      total,
      defiance,
      points,
      correctPicks
    });
  }

  // 5. Rank players
  // Sort userScores by total desc, then defiance desc
  userScores.sort((a, b) => b.total - a.total || b.defiance - a.defiance);
  
  // Assign ranks
  userScores.forEach((u, i) => {
    u.rank = i + 1;
    // Update individual score docs with their rank
    const scoreRef = db.collection("scores").doc(u.uid);
    batch.set(scoreRef, { rank: u.rank }, { merge: true });
  });

  // 6. Update Leaderboard meta
  const topN = userScores.slice(0, 100).map(u => ({
    uid: u.uid,
    displayName: u.displayName,
    photoURL: u.photoURL,
    total: u.total,
    defiance: u.defiance,
    points: u.points,
    rank: u.rank
  }));

  const leaderboardRef = db.collection("meta").doc("leaderboard");
  batch.set(leaderboardRef, {
    topN,
    oracleTotal: oracleScore,
    updatedAt: new Date().toISOString()
  });

  await batch.commit();
  return { userCount: userScores.length, oracleScore };
}

exports.runScoring = onRequest(async (req, res) => {
  try {
    const result = await scoringLogic();
    res.status(200).send({ success: true, ...result });
  } catch (error) {
    console.error("Error running scoring:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

exports.scheduledScoring = onSchedule("every 30 minutes", async (event) => {
  try {
    const result = await scoringLogic();
    console.log(`Scheduled scoring complete: ${result.userCount} users scored. Oracle score: ${result.oracleScore}`);
  } catch (error) {
    console.error("Scheduled scoring failed:", error);
  }
});
