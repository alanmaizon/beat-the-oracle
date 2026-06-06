const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  
  // Set up browser context with custom viewport and MP4 video recording enabled
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: './demo-recordings',
      size: { width: 1280, height: 800 }
    }
  });

  const page = await context.newPage();
  
  // Attach event listeners for browser-side console logs and errors
  page.on('console', msg => console.log('💬 BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('❌ BROWSER ERROR:', err.message));
  
  console.log('🌐 Navigating to Local Vite Frontend URL...');
  await page.goto('http://localhost:5173/');
  
  // 1. Initial Load: Wait for Monte Carlo Odds to complete running
  console.log('📊 Loading pre-tournament Oracle odds...');
  await page.waitForTimeout(4000); 

  // 2. Start the Simulation
  const startBtn = page.locator('#btnStartGroups');
  console.log('⚽ Clicking "Start group stage simulation ▸" button...');
  await startBtn.click();
  await page.waitForTimeout(2000);

  // 3. Select 2 qualifiers from each of the 12 groups (A to L)
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  console.log('🗳️ Selecting group stage picks...');
  for (let i = 0; i < groups.length; i++) {
    const k = groups[i];
    // Find group card container
    const groupCard = page.locator('.group').nth(i);
    // Find all team button selectors in this card
    const teamButtons = groupCard.locator('.team');
    
    // Select the 1st and 2nd teams in each group card
    await teamButtons.nth(0).click();
    await page.waitForTimeout(150);
    await teamButtons.nth(1).click();
    await page.waitForTimeout(150);
  }
  
  console.log('✅ Group picks completed. Triggering Group Simulation...');
  await page.waitForTimeout(1500);

  // 4. Simulate Group Stage and view standings
  const simBtn = page.locator('#simBtn');
  await simBtn.click();
  console.log('⚡ Group stage simulated! Loading standings table...');
  await page.waitForTimeout(4000);

  // 5. Advance to Round of 32
  console.log('🎟️ Entering Knockouts (Round of 32)...');
  await simBtn.click();
  await page.waitForTimeout(2500);

  // 6. Play through all Knockout Rounds
  const koRounds = [
    { name: "Round of 32", matches: 16 },
    { name: "Round of 16", matches: 8 },
    { name: "Quarter-finals", matches: 4 },
    { name: "Semi-finals", matches: 2 },
    { name: "The Final", matches: 1 }
  ];

  for (let roundIdx = 0; roundIdx < koRounds.length; roundIdx++) {
    const r = koRounds[roundIdx];
    console.log(`🏟️ Playing through ${r.name} (${r.matches} matches)...`);

    // Pick a winner for each match in this round
    for (let m = 0; m < r.matches; m++) {
      const matchCard = page.locator('.match').nth(m);
      const teamButtons = matchCard.locator('.team-pick');
      // Pick the first team button in each match
      await teamButtons.nth(0).click();
      await page.waitForTimeout(150);
    }

    console.log(`👉 All matches chosen in ${r.name}. Playing round...`);
    const advanceBtn = page.locator('#advanceBtn');
    await advanceBtn.click(); // play round (shows results)
    await page.waitForTimeout(3000);

    console.log(`➡️ Advancing from ${r.name}...`);
    await advanceBtn.click(); // advance to next round
    await page.waitForTimeout(2500);
  }

  // 7. Render Final grade and World Champion
  console.log('🏆 Reached Final Screen! Generating tournament summary & grading...');
  await page.waitForTimeout(5000);

  // Close context to force Playwright to save the MP4 video properly
  await context.close();
  await browser.close();

  // Find the generated video file
  const files = fs.readdirSync('./demo-recordings');
  const videoFile = files.find(f => f.endsWith('.webm') || f.endsWith('.mp4'));
  
  if (videoFile) {
    const originalPath = path.join('./demo-recordings', videoFile);
    const finalPath = path.join('./demo-recordings', 'beat_the_oracle_demo.webm');
    fs.renameSync(originalPath, finalPath);
    console.log(`🎉 Playwright demo video successfully recorded and saved to: ${finalPath}`);
  } else {
    console.log('⚠️ Video file was not found inside the recordings directory.');
  }
})();
