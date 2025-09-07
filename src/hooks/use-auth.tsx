
"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  signInAnonymously,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface User {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (
    email: string,
    password: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserData: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            isAnonymous: firebaseUser.isAnonymous,
          });
        } else {
            // This could be a new signup or an anonymous user
             setUser({ 
               uid: firebaseUser.uid, 
               email: firebaseUser.email,
               isAnonymous: firebaseUser.isAnonymous 
              });
        }
      } else {
        // No user is signed in, so create an anonymous user.
        await signInAnonymously(auth).catch(error => {
          console.error("Error signing in anonymously:", error);
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (
    email: string,
    password: string,
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;
    
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDataToSave = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        type: 'public',
    };

    await setDoc(userDocRef, userDataToSave);

    setUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      isAnonymous: false,
    });
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/signin');
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    setUserData: setUser,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
