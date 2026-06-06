const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Rely on default ADC

initializeApp({
  projectId: "project-87d15b7f-7332-458c-a73"
});
const db = getFirestore();

async function run() {
  console.log("--- DB CHECK ---");
  const resultsSnap = await db.collection("results").get();
  console.log("Results count:", resultsSnap.size);
  
  const scoresSnap = await db.collection("scores").get();
  console.log("Scores count:", scoresSnap.size);
  scoresSnap.forEach(doc => {
    console.log("Score doc ID:", doc.id, "=>Data:", doc.data());
  });

  const configSnap = await db.collection("config").get();
  console.log("Config count:", configSnap.size);
  configSnap.forEach(doc => {
    console.log("Config:", doc.id, "=>", doc.data());
  });

  const teamsSnap = await db.collection("teams").get();
  console.log("Teams count:", teamsSnap.size);

  const predictionsSnap = await db.collection("predictions").get();
  console.log("Predictions count:", predictionsSnap.size);
  predictionsSnap.forEach(doc => {
    console.log("Prediction doc ID:", doc.id);
  });
}

run().catch(console.error);
