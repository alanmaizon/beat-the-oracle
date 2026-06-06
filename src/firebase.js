import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";

// Canonical Firebase Configuration using project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "project-87d15b7f-7332-458c-a73.firebaseapp.com",
  projectId: "project-87d15b7f-7332-458c-a73",
  storageBucket: "project-87d15b7f-7332-458c-a73.appspot.com",
  messagingSenderId: "490238296903",
  appId: "1:490238296903:web:7f6d2b591b61c716f94bb2" // standard auto-generated app ID format
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

// Sign in using popup
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save/update user profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      displayName: user.displayName || "Player",
      photoURL: user.photoURL || "",
      email: user.email || "",
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

// Sign out
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

// Lock-in Predictions to Firebase
export async function submitPrediction(uid, groupPicks, koPicks) {
  try {
    const batchData = {
      groupPicks,
      koPicks,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 1. Save predictions under the predictions collection
    await setDoc(doc(db, "predictions", uid), batchData);
    
    // 2. Initialize standard score entry (0 total, 0 defiance, 0 points)
    await setDoc(doc(db, "scores", uid), {
      points: 0,
      defiance: 0,
      total: 0,
      correctPicks: 0,
      accuracy: 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error("Failed to submit prediction bracket:", error);
    throw error;
  }
}
