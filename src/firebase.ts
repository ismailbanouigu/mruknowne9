import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQbc1A3FdmsOHpIOGv4f5KqAhDysOHzHg",
  authDomain: "mruknowne9.firebaseapp.com",
  projectId: "mruknowne9",
  storageBucket: "mruknowne9.firebasestorage.app",
  messagingSenderId: "931587160829",
  appId: "1:931587160829:web:de8d325dd283eab8addc94"
  // Removed measurementId to prevent analytics-related fetch issues
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut };
