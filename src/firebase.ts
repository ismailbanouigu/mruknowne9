import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQbc1A3FdmsOHpIOGv4f5KqAhDysOHzHg",
  authDomain: "mruknowne9.firebaseapp.com",
  projectId: "mruknowne9",
  storageBucket: "mruknowne9.firebasestorage.app",
  messagingSenderId: "931587160829",
  appId: "1:931587160829:web:de8d325dd283eab8addc94",
  measurementId: "G-HL0PJCM0RW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { signInWithPopup, signOut, analytics };
