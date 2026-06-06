import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  submitPrediction,
  updateUserScore
} from "./firebase.js";
import { 
  GROUPS, 
  GKEYS, 
  flag, 
  eff, 
  winProb, 
  playMatch, 
  simGroup, 
  monteCarloTitle, 
  seedBracket 
} from "./elo.js";
import { 
  doc, 
  onSnapshot, 
  getDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// ===== STATE MANAGEMENT =====
let currentUser = null;
let userPrediction = null;
let userScore = null;
let userScoreUnsubscribe = null;
let leaderboardData = null;
let tournamentConfig = { locked: false, lockAt: "2026-06-11T20:30:00Z" };
let S = null; // Simulation State

// Knockout Rounds configurations
const KO = [
  { key: "r32", title: "Round of 32", sky: ["#241b48", "#f0a23a"], glow: [8, 72] },
  { key: "r16", title: "Round of 16", sky: ["#33265f", "#ffb13e"], glow: [26, 46] },
  { key: "qf", title: "Quarter-finals", sky: ["#4a3a86", "#ffc24a"], glow: [48, 26] },
  { key: "sf", title: "Semi-finals", sky: ["#6a86c0", "#fff0b0"], glow: [66, 20] },
  { key: "final", title: "The Final", sky: ["#c79fd2", "#e8852b"], glow: [82, 58] }
];

// Helper to set sky colors dynamically
function setSky(top, bot, gx, gy, scale) {
  const sky = document.getElementById('sky');
  if (sky) {
    sky.style.setProperty('--sky-top', top); 
    sky.style.setProperty('--sky-bot', bot);
  }
  const g = document.getElementById('glow'); 
  if (g) {
    g.style.left = gx + '%'; 
    g.style.top = gy + '%'; 
    g.style.transform = `scale(${scale})`;
  }
}

// ===== AUTH UI AND INTERACTION =====
const authLoggedOut = document.getElementById("authLoggedOut");
const authLoggedIn = document.getElementById("authLoggedIn");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignOut = document.getElementById("btnSignOut");
const bracketStatusMsg = document.getElementById("bracketStatusMsg");

btnSignIn.addEventListener("click", async () => {
  try {
    btnSignIn.disabled = true;
    await signInWithGoogle();
  } catch (error) {
    alert("Authentication failed. Please try again.");
  } finally {
    btnSignIn.disabled = false;
  }
});

btnSignOut.addEventListener("click", async () => {
  await logout();
  location.reload();
});

// Watch Auth Changes
onAuthStateChanged(auth, async (user) => {
  if (userScoreUnsubscribe) {
    userScoreUnsubscribe();
    userScoreUnsubscribe = null;
  }

  if (user) {
    currentUser = user;
    authLoggedOut.classList.add("hidden");
    authLoggedIn.classList.remove("hidden");
    userAvatar.src = user.photoURL || "";
    userName.textContent = user.displayName || "Player";
    
    // Subscribe to real-time score changes for current user
    userScoreUnsubscribe = onSnapshot(doc(db, "scores", user.uid), (scoreSnap) => {
      if (scoreSnap.exists()) {
        userScore = scoreSnap.data();
      } else {
        userScore = null;
      }
      renderLeaderboardTable();
    });
    
    // 1. Fetch user predictions
    const predSnap = await getDoc(doc(db, "predictions", user.uid));
    if (predSnap.exists()) {
      userPrediction = predSnap.data();
      bracketStatusMsg.innerHTML = `⭐ Prediction bracket LOCKED! Track your points in the leaderboard.`;
      
      // Let them browse their locked prediction
      document.getElementById("btnStartGroups").textContent = "View My Locked predictions ▸";
    } else {
      userPrediction = null;
      if (isTournamentLocked()) {
        bracketStatusMsg.textContent = "🔒 Predictions are locked for this tournament. In-memory play only.";
      } else {
        bracketStatusMsg.textContent = "🔓 You haven't submitted a bracket yet. Play and lock it in!";
      }
    }
  } else {
    currentUser = null;
    userPrediction = null;
    userScore = null;
    authLoggedOut.classList.remove("hidden");
    authLoggedIn.classList.add("hidden");
    bracketStatusMsg.textContent = "⚡ Play unauthenticated or sign in to appear on the leaderboard.";
    document.getElementById("btnStartGroups").textContent = "Start group stage simulation ▸";
  }
  renderSubmitPanel();
  renderLeaderboardTable();
});

// Watch Tournament Config
onSnapshot(doc(db, "config", "tournament"), (snap) => {
  if (snap.exists()) {
    tournamentConfig = snap.data();
    renderSubmitPanel();
  }
});

function isTournamentLocked() {
  if (tournamentConfig.locked) return true;
  if (tournamentConfig.lockAt) {
    const lockTime = new Date(tournamentConfig.lockAt).getTime();
    const now = new Date().getTime();
    return now >= lockTime;
  }
  return false;
}

// ===== REAL-TIME LEADERBOARD =====
function renderLeaderboardTable() {
  const tbody = document.getElementById("leaderboardBody");
  if (!tbody) return;

  if (leaderboardData) {
    const topN = leaderboardData.topN || [];
    const oracleTotal = leaderboardData.oracleTotal || 0;

    // Merge Oracle into the list only if tournament is locked/live
    const rows = topN.map(p => ({ ...p, isOracle: false }));
    if (isTournamentLocked()) {
      rows.push({
        uid: "oracle_agent",
        displayName: "🤖 The Oracle (Benchmark)",
        photoURL: "",
        points: oracleTotal,
        defiance: 0,
        total: oracleTotal,
        isOracle: true
      });
    }

    // Sort: Total Score desc, then Defiance desc
    rows.sort((a, b) => b.total - a.total || b.defiance - a.defiance);

    // Build Table Rows HTML
    let tableHtml = "";
    let userInTopN = false;

    rows.forEach((row, index) => {
      const rank = index + 1;
      let rowClass = "";
      if (row.isOracle) {
        rowClass = 'class="oracle-row"';
      } else if (currentUser && row.uid === currentUser.uid) {
        rowClass = 'class="me"';
        userInTopN = true;
      }

      const avatar = row.isOracle 
        ? "⚽" 
        : (row.photoURL ? `<img class="user-avatar" style="width:20px;height:20px;margin-right:6px;" src="${row.photoURL}">` : "👤 ");

      tableHtml += `<tr ${rowClass}>
        <td class="l rank-num">#${rank}</td>
        <td class="l" style="display:flex;align-items:center;">${avatar} ${row.displayName}</td>
        <td>${row.points}</td>
        <td>${row.defiance}</td>
        <td><b>${row.total}</b></td>
      </tr>`;
    });

    // If logged-in user is not in top N, and we have their score, append it
    if (currentUser && !userInTopN && userScore) {
      tableHtml += `<tr class="me" style="border-top: 2px dashed var(--gold);">
        <td class="l rank-num">#${userScore.rank || "—"}</td>
        <td class="l" style="display:flex;align-items:center;"><img class="user-avatar" style="width:20px;height:20px;margin-right:6px;" src="${currentUser.photoURL || ''}"> ${currentUser.displayName} (You)</td>
        <td>${userScore.points}</td>
        <td>${userScore.defiance}</td>
        <td><b>${userScore.total}</b></td>
      </tr>`;
    }

    tbody.innerHTML = tableHtml;
  } else {
    tbody.innerHTML = `<tr><td colspan="5" class="center"><div class="mono-note">No leaderboard data found. Database must be seeded first.</div></td></tr>`;
  }
}

onSnapshot(doc(db, "meta", "leaderboard"), (snap) => {
  if (snap.exists()) {
    leaderboardData = snap.data();
  } else {
    leaderboardData = null;
  }
  renderLeaderboardTable();
});

// ===== TABS CONTROLLER =====
const tabOddsBtn = document.getElementById("tabOddsBtn");
const tabLeaderboardBtn = document.getElementById("tabLeaderboardBtn");
const tabOdds = document.getElementById("tabOdds");
const tabLeaderboard = document.getElementById("tabLeaderboard");

tabOddsBtn.addEventListener("click", () => {
  tabOddsBtn.classList.add("active");
  tabLeaderboardBtn.classList.remove("active");
  tabOdds.classList.remove("hidden");
  tabLeaderboard.classList.add("hidden");
});

tabLeaderboardBtn.addEventListener("click", () => {
  tabLeaderboardBtn.classList.add("active");
  tabOddsBtn.classList.remove("active");
  tabLeaderboard.classList.remove("hidden");
  tabOdds.classList.add("hidden");
});

// ===== INTRO START FUNCTION =====
document.getElementById("btnStartGroups").addEventListener("click", () => {
  if (userPrediction) {
    // Browsing locked predictions
    startLockedMode();
  } else {
    // Normal simulator
    startGroups();
  }
});

// ===== MOUNT COMPONENT ACTIONS TO WINDOW GLOBAL SCOPE FOR HTML CALLBACKS =====
window.startGroups = startGroups;
window.pickGroup = pickGroup;
window.runGroups = runGroups;
window.pickKO = pickKO;
window.advance = advance;
window.scout = scout;

// ===== LOCAL/IN-MEMORY TOURNAMENT SIMULATOR =====
function startGroups() {
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('groups').classList.remove('hidden');
  setSky("#241b48", "#f0a23a", 10, 68, 1);
  
  S = {
    you: 0,
    oracle: 0,
    defiance: 0,
    picks: {},
    koPicks: { r32: {}, r16: {}, qf: {}, sf: {}, final: {} },
    gResults: null,
    ko: null,
    koIdx: 0,
    resolved: false
  };
  
  GKEYS.forEach(k => S.picks[k] = []);
  renderGroups();
  renderSubmitPanel();
  window.scrollTo(0, 0);
}

function oracleTop2(teams) {
  const s = teams.slice().sort((a, b) => eff(b) - eff(a));
  return [s[0].code, s[1].code];
}

function renderGroups() {
  const grid = document.getElementById('groupGrid');
  grid.innerHTML = '';
  GKEYS.forEach((k, gi) => {
    const teams = GROUPS[k];
    const o2 = oracleTop2(teams);
    const card = document.createElement('div');
    card.className = 'group fade-in';
    card.style.animationDelay = (gi * 40) + 'ms';
    card.innerHTML = `<h3>Group ${k} <span class="pickcount" id="pc${k}">0 / 2 picked</span></h3>` +
      teams.map(t => `<button class="team" id="g_${k}_${t.code}" onclick="pickGroup('${k}','${t.code}')">
        <span class="flag">${flag(t.code)}</span>
        <span class="nm">${t.name}${o2.includes(t.code) ? '<span class="otag">oracle</span>' : ''}</span>
        <span class="el">${t.elo}</span></button>`).join('');
    grid.appendChild(card);
  });
}

function pickGroup(k, code) {
  if (S.resolved) return;
  const arr = S.picks[k];
  const i = arr.indexOf(code);
  if (i >= 0) arr.splice(i, 1);
  else {
    if (arr.length >= 2) return;
    arr.push(code);
  }
  
  GROUPS[k].forEach(t => {
    const btn = document.getElementById(`g_${k}_${t.code}`);
    if (btn) btn.classList.toggle('sel', arr.includes(t.code));
  });
  
  const label = document.getElementById('pc' + k);
  if (label) label.textContent = `${arr.length} / 2 picked`;
  
  const ready = GKEYS.every(g => S.picks[g].length === 2);
  document.getElementById('simBtn').disabled = !ready;
  renderSubmitPanel();
}

function renderSubmitPanel() {
  const panel = document.getElementById("submitBracketPanel");
  const lockBtn = document.getElementById("btnLockInPredictions");
  if (!panel || !lockBtn) return;

  if (isTournamentLocked()) {
    panel.innerHTML = `<div class="mono-note" style="color:var(--ember); font-weight:bold;">🔒 Predictions are officially locked for this World Cup tournament!</div>`;
    panel.classList.remove("hidden");
    lockBtn.disabled = true;
    return;
  }

  if (!currentUser) {
    panel.innerHTML = `<div class="kicker" style="color: var(--amber)">Lock in your predictions</div>
      <h3 style="font-size:1.1rem; margin: 6px 0 10px;">Compete on the Global Leaderboard</h3>
      <p class="mono-note" style="margin-bottom:14px">Please sign in with Google in the top bar to lock in your prediction bracket!</p>`;
    panel.classList.remove("hidden");
    return;
  }

  if (userPrediction) {
    panel.classList.add("hidden");
    return;
  }

  // Check if all group picks are filled
  const ready = S && GKEYS.every(g => S.picks[g] && S.picks[g].length === 2);
  panel.classList.remove("hidden");
  lockBtn.disabled = !ready;
}

// Lock-in Predictions handler
document.getElementById("btnLockInPredictions").addEventListener("click", async () => {
  if (isTournamentLocked() || !currentUser || userPrediction) return;
  
  try {
    document.getElementById("btnLockInPredictions").disabled = true;
    document.getElementById("btnLockInPredictions").textContent = "Submitting bracket...";
    
    // Standardize bracket logic. During in-memory play, the user creates an entire bracket.
    // If they haven't simulated the knockouts yet, we can seed the knockouts deterministically based on their group picks!
    // Or we can save whatever matches they've completed. To make sure they have a COMPLETE bracket saved, 
    // we simulate their bracket knockouts deterministically if they haven't finished them, OR we can let them save their completed simulation bracket at the end.
    // Let's seed and solve the remaining knockouts deterministically using their group selections so that we guarantee a FULL bracket is locked!
    const groupPicks = S.picks;
    const koPicks = { r32: {}, r16: {}, qf: {}, sf: {}, final: {} };
    
    // Seeding Round of 32
    // For each group, the user selected 2 teams. We rank them by Elo to determine winner and runner up.
    const groupQualifiers = [];
    const thirds = [];
    GKEYS.forEach(g => {
      const picks = groupPicks[g];
      const teams = GROUPS[g].filter(t => picks.includes(t.code));
      teams.sort((a, b) => eff(b) - eff(a));
      groupQualifiers.push(teams[0], teams[1]);
      
      const thirdTeam = GROUPS[g].find(t => !picks.includes(t.code));
      if (thirdTeam) thirds.push(thirdTeam);
    });
    
    // Sort 3rd place teams by Elo and pick top 8
    thirds.sort((a, b) => eff(b) - eff(a));
    const top8Thirds = thirds.slice(0, 8);
    const full32Qualifiers = groupQualifiers.concat(top8Thirds);
    
    // Simulate R32 deterministically
    let pool = seedBracket(full32Qualifiers);
    const r32Winners = [];
    for (let i = 0; i < pool.length; i += 2) {
      const winner = playMatch(pool[i], pool[i + 1]);
      koPicks.r32[`m${i / 2}`] = winner.code;
      r32Winners.push(winner);
    }
    
    // Simulate R16
    const r16Winners = [];
    for (let i = 0; i < r32Winners.length; i += 2) {
      const winner = playMatch(r32Winners[i], r32Winners[i + 1]);
      koPicks.r16[`m${i / 2}`] = winner.code;
      r16Winners.push(winner);
    }
    
    // Simulate QF
    const qfWinners = [];
    for (let i = 0; i < r16Winners.length; i += 2) {
      const winner = playMatch(r16Winners[i], r16Winners[i + 1]);
      koPicks.qf[`m${i / 2}`] = winner.code;
      qfWinners.push(winner);
    }
    
    // Simulate SF
    const sfWinners = [];
    for (let i = 0; i < qfWinners.length; i += 2) {
      const winner = playMatch(qfWinners[i], qfWinners[i + 1]);
      koPicks.sf[`m${i / 2}`] = winner.code;
      sfWinners.push(winner);
    }
    
    // Simulate Final
    const champion = playMatch(sfWinners[0], sfWinners[1]);
    koPicks.final["m0"] = champion.code;
    
    // Submit bracket
    await submitPrediction(currentUser.uid, groupPicks, koPicks);
    
    // Reload state
    userPrediction = { groupPicks, koPicks };
    bracketStatusMsg.innerHTML = `⭐ Prediction bracket LOCKED! Track your points in the leaderboard.`;
    document.getElementById("submitBracketPanel").classList.add("hidden");
    alert("Your prediction bracket has been locked successfully!");
    
    // Advance them to play in-memory
    runGroups();
  } catch (error) {
    alert("Submission failed: " + error.message);
  } finally {
    const lockBtn = document.getElementById("btnLockInPredictions");
    if (lockBtn) {
      lockBtn.disabled = false;
      lockBtn.textContent = "Lock in bracket";
    }
  }
});

function runGroups() {
  // Prompt logged-in users to lock in their predictions for the leaderboard before simulating
  if (currentUser && !userPrediction && !isTournamentLocked()) {
    const lock = confirm("📊 You are signed in, but you haven't locked in your prediction bracket for the Global Leaderboard yet!\n\nWould you like to LOCK IN your predictions now before simulating? (Highly recommended! Select 'Cancel' to simulate casually without saving.)");
    if (lock) {
      const lockBtn = document.getElementById("btnLockInPredictions");
      if (lockBtn) {
        lockBtn.click();
        return;
      }
    }
  }

  S.resolved = true;
  document.getElementById('simBtn').disabled = true;
  const grid = document.getElementById('groupGrid');
  grid.innerHTML = '';
  
  const thirds = [];
  const qualifiers = [];
  let dG = 0;
  
  GKEYS.forEach((k, gi) => {
    const tbl = simGroup(GROUPS[k]);
    const o2 = oracleTop2(GROUPS[k]);
    const realQ = [tbl[0].t.code, tbl[1].t.code];
    
    qualifiers.push(tbl[0].t, tbl[1].t);
    thirds.push({ t: tbl[2].t, pts: tbl[2].pts, gd: tbl[2].gd, gf: tbl[2].gf, grp: k });
    
    // Score computation
    let line = [];
    S.picks[k].forEach(code => {
      if (realQ.includes(code)) {
        S.you += 10;
        if (!o2.includes(code)) {
          S.defiance += 20;
          dG += 20;
        }
      }
    });
    o2.forEach(code => {
      if (realQ.includes(code)) S.oracle += 10;
    });
    
    const youGot = S.picks[k].filter(c => realQ.includes(c)).length;
    if (youGot === 2) line.push('<span class="gtag hit">both right</span>');
    else if (youGot === 1) line.push('<span class="gtag hit">1 of 2</span>');
    else line.push('<span class="gtag miss">missed both</span>');
    
    const defied = S.picks[k].some(c => realQ.includes(c) && !o2.includes(c));
    if (defied) line.push('<span class="gtag defy">defiance</span>');

    const card = document.createElement('div');
    card.className = 'group ';
    card.classList.add('fade-in');
    card.style.animationDelay = (gi * 40) + 'ms';
    
    let rows = tbl.map((r, pos) => {
      const q = pos < 2 ? 'q' : (pos === 2 ? 'q3' : 'out');
      const you = S.picks[k].includes(r.t.code) ? ' ◂ you' : '';
      return `<tr class="${q}">
        <td class="l"><span class="pos">${pos+1}</span>${flag(r.t.code)} ${r.t.name}${you}</td>
        <td>${r.w}-${r.d}-${r.l}</td>
        <td>${r.gd > 0 ? '+' : ''}${r.gd}</td>
        <td><b>${r.pts}</b></td>
      </tr>`;
    }).join('');
    
    card.innerHTML = `<h3>Group ${k}</h3>
      <table class="standtable">
        <tr><th class="l">Team</th><th>W-D-L</th><th>GD</th><th>Pts</th></tr>
        ${rows}
      </table>
      <div class="grp-result">${line.join('')}</div>`;
    grid.appendChild(card);
  });
  
  // Best 8 thirds
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const top8 = thirds.slice(0, 8);
  top8.forEach(x => qualifiers.push(x.t));
  S.qualifiers = qualifiers;
  
  updateHud();
  
  // Toggle submit panel off
  document.getElementById("submitBracketPanel").classList.add("hidden");
  
  // Configure Advance Button
  let btn = document.getElementById('simBtn');
  btn.disabled = false;
  btn.textContent = 'Enter the Round of 32 ▸';
  btn.onclick = startKnockout;
  document.getElementById('grpHint').innerHTML = `Green = qualified · gold = 3rd place. The 8 best 3rd-place teams advance too. <b>32 teams</b> reach the knockouts.`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== KNOCKOUT CONTROLLER =====
function startKnockout() {
  document.getElementById('groups').classList.add('hidden');
  document.getElementById('knock').classList.remove('hidden');
  S.ko = seedBracket(S.qualifiers);
  S.koIdx = 0;
  renderKO();
  window.scrollTo(0, 0);
}

function renderKO() {
  const r = KO[S.koIdx];
  setSky(r.sky[0], r.sky[1], r.glow[0], r.glow[1], 1 + S.koIdx * 0.18);
  
  document.getElementById('koKicker').textContent = `Phase 2 · ${r.title}`;
  document.getElementById('koTitle').textContent = r.title;
  document.getElementById('koHint').textContent = r.key === 'final' ? 'One match. One trophy.' : 'Pick a winner in every tie. Back an upset to out-score the Oracle.';
  
  S.koPicks[r.key] = {};
  S.resolved = false;
  
  const btn = document.getElementById('advanceBtn');
  btn.disabled = true;
  btn.textContent = r.key === 'final' ? 'Decide the cup ▸' : 'Play the round ▸';
  
  const wrap = document.getElementById('matches');
  wrap.innerHTML = '';
  
  for (let i = 0; i < S.ko.length; i += 2) {
    const a = S.ko[i];
    const b = S.ko[i + 1];
    const mi = i / 2;
    const pa = winProb(a, b);
    const fav = pa >= 0.5 ? a : b;
    
    const card = document.createElement('div');
    card.className = 'match fade-in';
    card.style.animationDelay = (mi * 30) + 'ms';
    card.id = 'm' + mi;
    card.innerHTML = `${tBtn(a, mi, fav, pa)}<div class="vs">— vs —</div>${tBtn(b, mi, fav, 1-pa)}<div class="result-strip" id="rs${mi}"></div>`;
    wrap.appendChild(card);
  }
}

function tBtn(t, mi, fav, p) {
  const isFav = t.code === fav.code;
  return `<button class="team-pick" id="k_${mi}_${t.code}" onclick="pickKO(${mi},'${t.code}')">
    <span class="flag">${flag(t.code)}</span>
    <span>
      <span class="nm">${t.name}</span>${isFav ? '<span class="oracle-tag">oracle</span>' : ''}
      <div class="prob">${Math.round(p * 100)}% · Elo ${t.elo}</div>
      <button class="scout-btn" onclick="event.stopPropagation();scout(${mi},'${t.code}',this)">scouting ▸</button>
      <span class="scout" id="sc_${mi}_${t.code}"></span>
    </span>
    <span class="meta">${t.conf}${t.host ? ' · HOST' : ''}</span>
  </button>`;
}

// Call Gemini Scouting via Cloud Function (with Firestore cache and offline fallback)
async function scout(mi, code, btn) {
  const el = document.getElementById(`sc_${mi}_${code}`);
  if (!el) return;
  
  if (el.classList.contains('show')) {
    el.classList.remove('show');
    return;
  }
  
  el.textContent = '…consulting Gemini…';
  el.classList.add('show');
  
  const t = S.ko.find(x => x.code === code);
  
  try {
    const response = await fetch("https://scouting-vb6z2eah4a-uc.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ teamCode: code })
    });
    
    if (response.ok) {
      const data = await response.json();
      el.textContent = data.report || "No report returned.";
    } else {
      throw new Error("Cloud Function HTTP failed");
    }
  } catch (error) {
    console.warn("Could not load Gemini report, falling back to client-side ELO summary:", error);
    // Standard client-side fallback
    const wr = t.wins / (t.wins + t.draws + t.losses);
    const gd = t.gf - t.ga;
    const tier = t.elo >= 2000 ? "heavyweight contenders" : t.elo >= 1850 ? "serious threat" : t.elo >= 1700 ? "spunky underdogs" : "long shot entries";
    const form = wr > 0.55 ? "historically robust" : wr > 0.45 ? "prone to hot streaks" : "uneven form";
    const conf = { UEFA: "Europe", CONMEBOL: "South America", AFC: "Asia", CAF: "Africa", CONCACAF: "North/Central America", OFC: "Oceania" }[t.conf] || t.conf;
    el.textContent = `${t.name}: ${tier} from ${conf}. A ${form} team with Elo ${t.elo}.`;
  }
}

function pickKO(mi, code) {
  if (S.resolved) return;
  const currentKey = KO[S.koIdx].key;
  S.koPicks[currentKey][`m${mi}`] = code;
  
  const a = S.ko[mi * 2];
  const b = S.ko[mi * 2 + 1];
  [a, b].forEach(t => {
    const btn = document.getElementById(`k_${mi}_${t.code}`);
    if (btn) btn.classList.toggle('sel', t.code === code);
  });
  
  if (Object.keys(S.koPicks[currentKey]).length === S.ko.length / 2) {
    document.getElementById('advanceBtn').disabled = false;
  }
}

function advance() {
  const currentKey = KO[S.koIdx].key;
  if (S.resolved) {
    S.koIdx++;
    if (S.koIdx >= KO.length) {
      endGame();
      return;
    }
    renderKO();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  
  S.resolved = true;
  document.getElementById('advanceBtn').disabled = true;
  const winners = [];
  
  for (let i = 0; i < S.ko.length; i += 2) {
    const a = S.ko[i];
    const b = S.ko[i + 1];
    const mi = i / 2;
    const pa = winProb(a, b);
    const fav = pa >= 0.5 ? a : b;
    const dog = pa >= 0.5 ? b : a;
    
    // Simulate real match outcome
    const real = Math.random() < pa ? a : b;
    winners.push(real);
    
    const upset = real.code === dog.code;
    const you = S.koPicks[currentKey][`m${mi}`];
    const youRight = you === real.code;
    const oracleRight = fav.code === real.code;
    
    let line = [];
    if (youRight) {
      S.you += 10;
      line.push('<span class="tag hit">you +10</span>');
    } else {
      line.push('<span class="tag miss">you miss</span>');
    }
    
    if (oracleRight) S.oracle += 10;
    
    if (upset && youRight) {
      S.defiance += 25;
      line.push('<span class="tag defy">defiance +25</span>');
    }
    if (upset && !oracleRight) {
      line.push('<span class="tag om">oracle fooled</span>');
    }
    
    const realBtn = document.getElementById(`k_${mi}_${real.code}`);
    if (realBtn) realBtn.classList.add('winner');
    
    const loser = real.code === a.code ? b : a;
    const loserBtn = document.getElementById(`k_${mi}_${loser.code}`);
    if (loserBtn) loserBtn.classList.add('loser');
    
    const resStrip = document.getElementById('rs' + mi);
    if (resStrip) {
      resStrip.innerHTML = `<b>${real.name} ${scoreFlavor(real, loser)}</b> ${line.join(' ')}`;
    }
  }
  
  S.ko = winners;
  updateHud();
  
  const btn = document.getElementById('advanceBtn');
  btn.disabled = false;
  btn.textContent = S.koIdx >= KO.length - 1 ? 'See full time ▸' : 'Advance ▸';
}

function scoreFlavor(w, l) {
  const diff = Math.max(1, Math.round(winProb(w, l) * 3));
  const gw = Math.max(1, 1 + Math.round(Math.random() * diff));
  const gl = Math.max(0, gw - 1 - Math.round(Math.random() * 2));
  return `${gw}–${gl}`;
}

function updateHud() {
  document.getElementById('hudYou').textContent = S.you;
  document.getElementById('hudOracle').textContent = S.oracle;
  document.getElementById('hudDefy').textContent = S.defiance;
  
  document.getElementById('hudYouG').textContent = S.you;
  document.getElementById('hudOracleG').textContent = S.oracle;
  document.getElementById('hudDefyG').textContent = S.defiance;
}

function endGame() {
  document.getElementById('knock').classList.add('hidden');
  const f = document.getElementById('final');
  f.classList.remove('hidden');
  setSky("#c79fd2", "#e8852b", 82, 58, 1.9);
  
  const champ = S.ko[0];
  document.getElementById('champLine').textContent = `${flag(champ.code)} ${champ.name}`;
  
  const totalYou = S.you + S.defiance;
  document.getElementById('fYou').textContent = totalYou;
  document.getElementById('fOracle').textContent = S.oracle;
  document.getElementById('fDefy').textContent = S.defiance;
  
  const margin = totalYou - S.oracle;
  let grade, verdict;
  
  if (S.defiance >= 120 && margin > 0) {
    grade = "S";
    verdict = "You read the chaos the model refused to see. Turing would have hired you.";
  } else if (margin > 0) {
    grade = "A";
    verdict = "You out-scored the Oracle. The favourite isn't always the answer.";
  } else if (margin === 0) {
    grade = "B";
    verdict = "Dead level with the algorithm. You think like the machine — for better or worse.";
  } else if (margin > -40) {
    grade = "C";
    verdict = "The Oracle edged you. Safe predictions rarely make history.";
  } else {
    grade = "D";
    verdict = "The machine won this one. Next time, dare more upsets.";
  }
  
  document.getElementById('grade').textContent = grade;
  document.getElementById('verdictLine').textContent = verdict;
  
  document.getElementById('defyNote').textContent = S.defiance > 0
    ? `You banked ${S.defiance} Defiance points the Oracle could never earn.`
    : `Zero Defiance — you played the book. The Oracle respects you, but it doesn't fear you.`;
    
  // If user is logged in, save their score to Firestore to update the leaderboard
  if (currentUser) {
    updateUserScore(currentUser.uid, S.you, S.defiance, totalYou)
      .then(() => {
        console.log("Score successfully saved to the leaderboard!");
      })
      .catch(err => {
        console.error("Failed to save score to the leaderboard:", err);
      });
  }
    
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Reload action
document.getElementById("btnReload").addEventListener("click", () => {
  location.reload();
});

// ===== LOCKED VIEW MODE =====
function startLockedMode() {
  if (!userPrediction) return;
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('groups').classList.remove('hidden');
  setSky("#241b48", "#f0a23a", 10, 68, 1);
  
  S = {
    you: 0,
    oracle: 0,
    defiance: 0,
    picks: userPrediction.groupPicks,
    koPicks: userPrediction.koPicks,
    ko: null,
    koIdx: 0,
    resolved: true // locked, non-interactive
  };
  
  // Render group grids showing what they picked
  const grid = document.getElementById('groupGrid');
  grid.innerHTML = '';
  GKEYS.forEach((k, gi) => {
    const teams = GROUPS[k];
    const o2 = oracleTop2(teams);
    const arr = S.picks[k] || [];
    
    const card = document.createElement('div');
    card.className = 'group fade-in';
    card.style.animationDelay = (gi * 40) + 'ms';
    card.innerHTML = `<h3>Group ${k} <span class="pickcount" id="pc${k}">2 / 2 locked</span></h3>` +
      teams.map(t => {
        const isSelected = arr.includes(t.code);
        const selClass = isSelected ? "sel" : "";
        return `<button class="team ${selClass}" id="g_${k}_${t.code}" disabled>
          <span class="flag">${flag(t.code)}</span>
          <span class="nm">${t.name}${o2.includes(t.code) ? '<span class="otag">oracle</span>' : ''}</span>
          <span class="el">${t.elo}</span></button>`;
      }).join('');
    grid.appendChild(card);
  });
  
  // Change simulator button to advance directly to see knockouts
  const btn = document.getElementById('simBtn');
  btn.disabled = false;
  btn.textContent = 'View Locked Knockouts ▸';
  btn.onclick = () => {
    document.getElementById('groups').classList.add('hidden');
    document.getElementById('knock').classList.remove('hidden');
    S.ko = seedBracket(getLockedQualifiers());
    S.koIdx = 0;
    renderLockedKO();
  };
}

function getLockedQualifiers() {
  const qualifiers = [];
  const thirds = [];
  GKEYS.forEach(k => {
    const picks = S.picks[k] || [];
    const teams = GROUPS[k].filter(t => picks.includes(t.code));
    teams.sort((a, b) => eff(b) - eff(a));
    if (teams[0]) qualifiers.push(teams[0]);
    if (teams[1]) qualifiers.push(teams[1]);
    
    const remaining = GROUPS[k].filter(t => !picks.includes(t.code));
    remaining.forEach(t => thirds.push(t));
  });
  thirds.sort((a, b) => eff(b) - eff(a));
  thirds.slice(0, 8).forEach(t => qualifiers.push(t));
  return qualifiers;
}

function renderLockedKO() {
  const r = KO[S.koIdx];
  setSky(r.sky[0], r.sky[1], r.glow[0], r.glow[1], 1 + S.koIdx * 0.18);
  
  document.getElementById('koKicker').textContent = `Locked Predictions`;
  document.getElementById('koTitle').textContent = r.title;
  document.getElementById('koHint').textContent = "Your locked knockout predictions for this stage.";
  
  const btn = document.getElementById('advanceBtn');
  btn.disabled = false;
  btn.textContent = r.key === 'final' ? 'Back to Dashboard ▸' : 'Next Round ▸';
  btn.onclick = () => {
    if (r.key === 'final') {
      location.reload();
      return;
    }
    S.koIdx++;
    renderLockedKO();
  };
  
  const wrap = document.getElementById('matches');
  wrap.innerHTML = '';
  
  const stagePicks = S.koPicks[r.key] || {};
  const nextRoundTeams = [];
  
  for (let i = 0; i < S.ko.length; i += 2) {
    const a = S.ko[i];
    const b = S.ko[i + 1];
    const mi = i / 2;
    const pa = winProb(a, b);
    const fav = pa >= 0.5 ? a : b;
    
    const pickedCode = stagePicks[`m${mi}`];
    const pickedTeam = pickedCode === a.code ? a : (pickedCode === b.code ? b : null);
    if (pickedTeam) nextRoundTeams.push(pickedTeam);
    else nextRoundTeams.push(fav); // backup fallback
    
    const card = document.createElement('div');
    card.className = 'match fade-in';
    card.style.animationDelay = (mi * 30) + 'ms';
    
    const renderBtn = (t, p) => {
      const isFav = t.code === fav.code;
      const isPicked = t.code === pickedCode;
      const selClass = isPicked ? "sel" : "";
      return `<button class="team-pick ${selClass}" style="cursor:default;" disabled>
        <span class="flag">${flag(t.code)}</span>
        <span>
          <span class="nm">${t.name}</span>${isFav ? '<span class="oracle-tag">oracle</span>' : ''}
          <div class="prob">${Math.round(p * 100)}% · Elo ${t.elo}</div>
        </span>
        <span class="meta">${t.conf}${t.host ? ' · HOST' : ''}</span>
      </button>`;
    };
    
    card.innerHTML = `${renderBtn(a, pa)}<div class="vs">— vs —</div>${renderBtn(b, 1-pa)}`;
    wrap.appendChild(card);
  }
  
  S.ko = nextRoundTeams;
}

// ===== INITIALIZATION & MOUNT ODDS PANEL =====
(function init() {
  setTimeout(() => {
    const board = document.getElementById('oracleBoard');
    if (!board) return;
    
    const odds = monteCarloTitle(5000).slice(0, 8);
    const max = odds[0].p;
    
    board.innerHTML = odds.map(o => `
      <div class="odds-row">
        <span class="flag">${flag(o.t.code)}</span>
        <span class="nm">${o.t.name}<div class="bar"><span style="width:${(o.p/max*100).toFixed(1)}%"></span></div></span>
        <span class="pct">${(o.p*100).toFixed(1)}%</span>
      </div>
    `).join('');
  }, 100);
})();
