import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function upsertUserDoc(u: User) {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // First sign-in: create document with all stats initialized
      await setDoc(ref, {
        displayName: u.displayName ?? "Anonymous",
        photoURL: u.photoURL ?? "",
        gamesPlayed: 0,
        wins: 0,
        winsByRole: { liberal: 0, fascist: 0, hitler: 0 },
        createdAt: serverTimestamp(),
      });
    } else {
      // Returning user: update profile fields only (preserve game stats)
      await updateDoc(ref, {
        displayName: u.displayName ?? "Anonymous",
        photoURL: u.photoURL ?? "",
        updatedAt: serverTimestamp(),
      });
    }
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await upsertUserDoc(result.user);
  }

  async function signInWithEmail(email: string, password: string) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await upsertUserDoc(result.user);
  }

  async function registerWithEmail(email: string, password: string, name: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await setDoc(doc(db, "users", result.user.uid), {
      displayName: name,
      photoURL: "",
      gamesPlayed: 0,
      wins: 0,
      winsByRole: { liberal: 0, fascist: 0, hitler: 0 },
      createdAt: serverTimestamp(),
    });
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signInWithEmail, registerWithEmail, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
