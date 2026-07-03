import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

/**
 * NEXUS CORE - FIREBASE CONFIGURATION
 * Project: RxFx Logbook
 */
const firebaseConfig = {
  apiKey: "AIzaSyBDiAmEKb2xNq4sqrwZ2W8qJPs47T1izr0",
  authDomain: "rxfx-logbook-38944.firebaseapp.com",
  projectId: "rxfx-logbook-38944",
  storageBucket: "rxfx-logbook-38944.firebasestorage.app",
  messagingSenderId: "587977763986",
  appId: "1:587977763986:web:3ca86cc69f5fe6463cca4b",
  measurementId: "G-HJC7L0X586"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
