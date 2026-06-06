const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({
  projectId: "project-87d15b7f-7332-458c-a73"
});
const db = getFirestore();

async function run() {
  console.log("--- META CHECK ---");
  const metaSnap = await db.collection("meta").get();
  console.log("Meta count:", metaSnap.size);
  metaSnap.forEach(doc => {
    console.log("Meta ID:", doc.id, "=>Data:", doc.data());
  });

  const scoresSnap = await db.collection("scores").get();
  console.log("Scores count:", scoresSnap.size);
  scoresSnap.forEach(doc => {
    console.log("Score:", doc.id, "=>Data:", doc.data());
  });
}

run().catch(console.error);
