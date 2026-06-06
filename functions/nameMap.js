"use strict";

const PROVIDER_NAME_TO_CODE = {
  // Group A
  "Mexico": "MX",
  "South Africa": "ZA",
  "Korea Republic": "KR",
  "South Korea": "KR",
  "Czechia": "CZ",
  "Czech Republic": "CZ",

  // Group B
  "Canada": "CA",
  "Bosnia and Herzegovina": "BA",
  "Bosnia-Herzegovina": "BA",
  "Qatar": "QA",
  "Switzerland": "CH",

  // Group C
  "Brazil": "BR",
  "Morocco": "MA",
  "Haiti": "HT",
  "Scotland": "SQ",

  // Group D
  "United States": "US",
  "USA": "US",
  "United States of America": "US",
  "Paraguay": "PY",
  "Australia": "AU",
  "Turkey": "TR",
  "Türkiye": "TR",

  // Group E
  "Germany": "DE",
  "Curaçao": "CW",
  "Curacao": "CW",
  "Ivory Coast": "CI",
  "Côte d'Ivoire": "CI",
  "Ecuador": "EC",

  // Group F
  "Netherlands": "NL",
  "Japan": "JP",
  "Sweden": "SE",
  "Tunisia": "TN",

  // Group G
  "Belgium": "BE",
  "Egypt": "EG",
  "Iran": "IR",
  "IR Iran": "IR",
  "New Zealand": "NZ",

  // Group H
  "Spain": "ES",
  "Cape Verde": "CV",
  "Cabo Verde": "CV",
  "Saudi Arabia": "SA",
  "Uruguay": "UY",

  // Group I
  "France": "FR",
  "Senegal": "SN",
  "Iraq": "IQ",
  "Norway": "NO",

  // Group J
  "Argentina": "AR",
  "Algeria": "DZ",
  "Austria": "AT",
  "Jordan": "JO",

  // Group K
  "Portugal": "PT",
  "DR Congo": "CD",
  "Congo DR": "CD",
  "Uzbekistan": "UZ",
  "Colombia": "CO",

  // Group L
  "England": "EN",
  "Croatia": "HR",
  "Ghana": "GH",
  "Panama": "PA"
};

/**
 * Maps a team name from the football data provider to our internal code.
 * @param {string} name - The team name from the provider.
 * @returns {string|null} - The 2-letter country code or null if not found.
 */
function mapTeamNameToCode(name) {
  if (!name) return null;
  const normalized = name.trim();
  return PROVIDER_NAME_TO_CODE[normalized] || null;
}

module.exports = {
  mapTeamNameToCode,
  PROVIDER_NAME_TO_CODE
};
