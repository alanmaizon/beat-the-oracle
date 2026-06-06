"use strict";

// ===== REAL 2026 GROUPS · latest Elo snapshot per team =====
export const GROUPS = {
  "A": [
    { "name": "Mexico", "code": "MX", "elo": 1860, "conf": "CONCACAF", "host": 1, "rank": 20, "wins": 533, "losses": 258, "draws": 237, "gf": 1823, "ga": 1055 },
    { "name": "South Africa", "code": "ZA", "elo": 1524, "conf": "CAF", "host": 0, "rank": 79, "wins": 231, "losses": 141, "draws": 152, "gf": 719, "ga": 542 },
    { "name": "South Korea", "code": "KR", "elo": 1752, "conf": "AFC", "host": 0, "rank": 33, "wins": 571, "losses": 221, "draws": 258, "gf": 1907, "ga": 964 },
    { "name": "Czechia", "code": "CZ", "elo": 1726, "conf": "UEFA", "host": 0, "rank": 40, "wins": 424, "losses": 261, "draws": 197, "gf": 1624, "ga": 1097 }
  ],
  "B": [
    { "name": "Canada", "code": "CA", "elo": 1784, "conf": "CONCACAF", "host": 1, "rank": 25, "wins": 189, "losses": 185, "draws": 114, "gf": 626, "ga": 623 },
    { "name": "Bosnia and Herzegovina", "code": "BA", "elo": 1594, "conf": "UEFA", "host": 0, "rank": 66, "wins": 104, "losses": 111, "draws": 64, "gf": 393, "ga": 385 },
    { "name": "Qatar", "code": "QA", "elo": 1425, "conf": "AFC", "host": 0, "rank": 95, "wins": 289, "losses": 232, "draws": 176, "gf": 993, "ga": 825 },
    { "name": "Switzerland", "code": "CH", "elo": 1889, "conf": "UEFA", "host": 0, "rank": 16, "wins": 319, "losses": 373, "draws": 203, "gf": 1335, "ga": 1482 }
  ],
  "C": [
    { "name": "Brazil", "code": "BR", "elo": 1984, "conf": "CONMEBOL", "host": 0, "rank": 5, "wins": 670, "losses": 172, "draws": 223, "gf": 2294, "ga": 954 },
    { "name": "Morocco", "code": "MA", "elo": 1822, "conf": "CAF", "host": 0, "rank": 24, "wins": 364, "losses": 165, "draws": 199, "gf": 1103, "ga": 614 },
    { "name": "Haiti", "code": "HT", "elo": 1532, "conf": "CONCACAF", "host": 0, "rank": 77, "wins": 246, "losses": 197, "draws": 118, "gf": 957, "ga": 759 },
    { "name": "Scotland", "code": "SQ", "elo": 1767, "conf": "UEFA", "host": 0, "rank": 29, "wins": 411, "losses": 268, "draws": 188, "gf": 1495, "ga": 1075 }
  ],
  "D": [
    { "name": "United States", "code": "US", "elo": 1721, "conf": "CONCACAF", "host": 1, "rank": 41, "wins": 366, "losses": 286, "draws": 173, "gf": 1246, "ga": 1073 },
    { "name": "Paraguay", "code": "PY", "elo": 1833, "conf": "CONMEBOL", "host": 0, "rank": 22, "wins": 276, "losses": 303, "draws": 209, "gf": 1002, "ga": 1115 },
    { "name": "Australia", "code": "AU", "elo": 1783, "conf": "AFC", "host": 0, "rank": 26, "wins": 326, "losses": 179, "draws": 130, "gf": 1289, "ga": 714 },
    { "name": "Turkey", "code": "TR", "elo": 1902, "conf": "UEFA", "host": 0, "rank": 14, "wins": 263, "losses": 250, "draws": 156, "gf": 947, "ga": 969 }
  ],
  "E": [
    { "name": "Germany", "code": "DE", "elo": 1923, "conf": "UEFA", "host": 0, "rank": 11, "wins": 604, "losses": 224, "draws": 217, "gf": 2352, "ga": 1232 },
    { "name": "Curaçao", "code": "CW", "elo": 1436, "conf": "CONCACAF", "host": 0, "rank": 90, "wins": 201, "losses": 173, "draws": 124, "gf": 879, "ga": 767 },
    { "name": "Ivory Coast", "code": "CI", "elo": 1676, "conf": "CAF", "host": 0, "rank": 52, "wins": 348, "losses": 166, "draws": 178, "gf": 1130, "ga": 695 },
    { "name": "Ecuador", "code": "EC", "elo": 1933, "conf": "CONMEBOL", "host": 0, "rank": 9, "wins": 183, "losses": 254, "draws": 161, "gf": 719, "ga": 903 }
  ],
  "F": [
    { "name": "Netherlands", "code": "NL", "elo": 1961, "conf": "UEFA", "host": 0, "rank": 8, "wins": 465, "losses": 239, "draws": 197, "gf": 1892, "ga": 1142 },
    { "name": "Japan", "code": "JP", "elo": 1904, "conf": "AFC", "host": 0, "rank": 13, "wins": 408, "losses": 257, "draws": 170, "gf": 1517, "ga": 985 },
    { "name": "Sweden", "code": "SE", "elo": 1719, "conf": "UEFA", "host": 0, "rank": 43, "wins": 549, "losses": 335, "draws": 234, "gf": 2226, "ga": 1482 },
    { "name": "Tunisia", "code": "TN", "elo": 1636, "conf": "CAF", "host": 0, "rank": 58, "wins": 330, "losses": 229, "draws": 216, "gf": 1105, "ga": 839 }
  ],
  "G": [
    { "name": "Belgium", "code": "BE", "elo": 1867, "conf": "UEFA", "host": 0, "rank": 19, "wins": 390, "losses": 302, "draws": 184, "gf": 1599, "ga": 1359 },
    { "name": "Egypt", "code": "EG", "elo": 1689, "conf": "CAF", "host": 0, "rank": 51, "wins": 446, "losses": 216, "draws": 221, "gf": 1544, "ga": 921 },
    { "name": "Iran", "code": "IR", "elo": 1760, "conf": "AFC", "host": 0, "rank": 31, "wins": 382, "losses": 132, "draws": 154, "gf": 1270, "ga": 524 },
    { "name": "New Zealand", "code": "NZ", "elo": 1585, "conf": "OFC", "host": 0, "rank": 68, "wins": 181, "losses": 179, "draws": 79, "gf": 767, "ga": 645 }
  ],
  "H": [
    { "name": "Spain", "code": "ES", "elo": 2165, "conf": "UEFA", "host": 0, "rank": 1, "wins": 461, "losses": 138, "draws": 181, "gf": 1591, "ga": 697 },
    { "name": "Cape Verde", "code": "CV", "elo": 1549, "conf": "CAF", "host": 0, "rank": 72, "wins": 94, "losses": 97, "draws": 60, "gf": 267, "ga": 278 },
    { "name": "Saudi Arabia", "code": "SA", "elo": 1568, "conf": "AFC", "host": 0, "rank": 71, "wins": 396, "losses": 245, "draws": 194, "gf": 1281, "ga": 892 },
    { "name": "Uruguay", "code": "UY", "elo": 1892, "conf": "CONMEBOL", "host": 0, "rank": 15, "wins": 446, "losses": 321, "draws": 252, "gf": 1610, "ga": 1254 }
  ],
  "I": [
    { "name": "France", "code": "FR", "elo": 2081, "conf": "UEFA", "host": 0, "rank": 3, "wins": 474, "losses": 269, "draws": 195, "gf": 1706, "ga": 1272 },
    { "name": "Senegal", "code": "SN", "elo": 1878, "conf": "CAF", "host": 0, "rank": 17, "wins": 319, "losses": 192, "draws": 193, "gf": 967, "ga": 669 },
    { "name": "Iraq", "code": "IQ", "elo": 1607, "conf": "AFC", "host": 0, "rank": 63, "wins": 359, "losses": 189, "draws": 211, "gf": 1202, "ga": 707 },
    { "name": "Norway", "code": "NO", "elo": 1912, "conf": "UEFA", "host": 0, "rank": 12, "wins": 334, "losses": 355, "draws": 197, "gf": 1373, "ga": 1443 }
  ],
  "J": [
    { "name": "Argentina", "code": "AR", "elo": 2113, "conf": "CONMEBOL", "host": 0, "rank": 2, "wins": 610, "losses": 228, "draws": 271, "gf": 2112, "ga": 1136 },
    { "name": "Algeria", "code": "DZ", "elo": 1743, "conf": "CAF", "host": 0, "rank": 35, "wins": 309, "losses": 196, "draws": 183, "gf": 1052, "ga": 703 },
    { "name": "Austria", "code": "AT", "elo": 1827, "conf": "UEFA", "host": 0, "rank": 23, "wins": 370, "losses": 310, "draws": 185, "gf": 1560, "ga": 1321 },
    { "name": "Jordan", "code": "JO", "elo": 1690, "conf": "AFC", "host": 0, "rank": 50, "wins": 206, "losses": 218, "draws": 158, "gf": 727, "ga": 710 }
  ],
  "K": [
    { "name": "Portugal", "code": "PT", "elo": 1984, "conf": "UEFA", "host": 0, "rank": 5, "wins": 346, "losses": 189, "draws": 159, "gf": 1222, "ga": 779 },
    { "name": "DR Congo", "code": "CD", "elo": 1655, "conf": "CAF", "host": 0, "rank": 54, "wins": 226, "losses": 171, "draws": 150, "gf": 835, "ga": 641 },
    { "name": "Uzbekistan", "code": "UZ", "elo": 1727, "conf": "AFC", "host": 0, "rank": 38, "wins": 180, "losses": 110, "draws": 75, "gf": 635, "ga": 398 },
    { "name": "Colombia", "code": "CO", "elo": 1975, "conf": "CONMEBOL", "host": 0, "rank": 7, "wins": 265, "losses": 205, "draws": 178, "gf": 842, "ga": 741 }
  ],
  "L": [
    { "name": "England", "code": "EN", "elo": 2020, "conf": "UEFA", "host": 0, "rank": 4, "wins": 683, "losses": 215, "draws": 262, "gf": 2719, "ga": 1118 },
    { "name": "Croatia", "code": "HR", "elo": 1930, "conf": "UEFA", "host": 0, "rank": 10, "wins": 209, "losses": 83, "draws": 106, "gf": 694, "ga": 401 },
    { "name": "Ghana", "code": "GH", "elo": 1503, "conf": "CAF", "host": 0, "rank": 82, "wins": 370, "losses": 213, "draws": 195, "gf": 1247, "ga": 822 },
    { "name": "Panama", "code": "PA", "elo": 1737, "conf": "CONCACAF", "host": 0, "rank": 36, "wins": 196, "losses": 251, "draws": 144, "gf": 736, "ga": 906 }
  ]
};

export const GKEYS = Object.keys(GROUPS);

// flag emoji from ISO-2 code, with overrides for home nations
const FLAG_OVERRIDE = { EN: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SQ: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" };
export function flag(code) {
  if (FLAG_OVERRIDE[code]) return FLAG_OVERRIDE[code];
  if (!/^[A-Z]{2}$/.test(code)) return "⚽";
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// ===== ELO ENGINE =====
const HOST_BONUS = 60;
export const eff = t => t.elo + (t.host ? HOST_BONUS : 0);
export const winProb = (a, b) => 1 / (1 + Math.pow(10, (eff(b) - eff(a)) / 400));
export const playMatch = (a, b) => Math.random() < winProb(a, b) ? a : b;

// group round-robin sim with draws + goals
export function simGroupMatch(a, b) {
  const pa = winProb(a, b);
  const gap = Math.abs(eff(a) - eff(b));
  let pD = 0.28 - 0.00035 * gap; if (pD < 0.08) pD = 0.08;
  const pAw = (1 - pD) * pa, pBw = (1 - pD) * (1 - pa);
  const r = Math.random(); let res;
  if (r < pAw) res = "A"; else if (r < pAw + pBw) res = "B"; else res = "D";
  let ga, gb;
  if (res === "D") { ga = gb = Math.floor(Math.random() * 3); }
  else {
    const w = 1 + Math.floor(Math.random() * 3); const l = Math.max(0, w - 1 - Math.floor(Math.random() * 2));
    if (res === "A") { ga = w; gb = l; } else { ga = l; gb = w; }
  }
  return { ga, gb };
}

export function simGroup(teams) {
  const tbl = teams.map(t => ({ t, pts: 0, gf: 0, ga: 0, gd: 0, w: 0, d: 0, l: 0 }));
  const idx = {}; tbl.forEach((r, i) => idx[r.t.code] = i);
  for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) {
    const m = simGroupMatch(teams[i], teams[j]);
    const A = tbl[idx[teams[i].code]], B = tbl[idx[teams[j].code]];
    A.gf += m.ga; A.ga += m.gb; B.gf += m.gb; B.ga += m.ga;
    if (m.ga > m.gb) { A.pts += 3; A.w++; B.l++; }
    else if (m.gb > m.ga) { B.pts += 3; B.w++; A.l++; }
    else { A.pts++; B.pts++; A.d++; B.d++; }
  }
  tbl.forEach(r => r.gd = r.gf - r.ga);
  tbl.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || eff(y.t) - eff(x.t));
  return tbl;
}

// Monte Carlo title odds over the full 48-team format
export function quickQualifiers() {
  const winners = [], runners = [], thirds = [];
  GKEYS.forEach(k => {
    const s = simGroup(GROUPS[k]); winners.push(s[0].t); runners.push(s[1].t);
    thirds.push({ t: s[2].t, pts: s[2].pts, gd: s[2].gd, gf: s[2].gf });
  });
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return winners.concat(runners, thirds.slice(0, 8).map(x => x.t));
}

export function seedBracket(teams) {
  const s = teams.slice().sort((a, b) => eff(b) - eff(a));
  const o = [];
  for (let i = 0; i < s.length / 2; i++) {
    o.push(s[i]);
    o.push(s[s.length - 1 - i]);
  }
  return o;
}

export function monteCarloTitle(runs) {
  const tally = {}; GKEYS.forEach(k => GROUPS[k].forEach(t => tally[t.code] = 0));
  for (let r = 0; r < runs; r++) {
    let pool = seedBracket(quickQualifiers());
    while (pool.length > 1) {
      const n = []; for (let i = 0; i < pool.length; i += 2) n.push(playMatch(pool[i], pool[i + 1])); pool = n;
    }
    tally[pool[0].code]++;
  }
  const all = []; GKEYS.forEach(k => GROUPS[k].forEach(t => all.push({ t, p: tally[t.code] / runs })));
  return all.sort((a, b) => b.p - a.p);
}
