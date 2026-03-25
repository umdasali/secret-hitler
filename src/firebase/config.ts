import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDAs522DZjVye99RqDDVgfc6e4g38pdlZY",
  authDomain: "secret-hitler-8cf81.firebaseapp.com",
  projectId: "secret-hitler-8cf81",
  storageBucket: "secret-hitler-8cf81.firebasestorage.app",
  messagingSenderId: "348276854841",
  appId: "1:348276854841:web:6c59a7c24450703dff3de8",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
