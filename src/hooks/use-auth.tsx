
"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  ConfirmationResult
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";

interface User {
  uid: string;
  phoneNumber: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setupRecaptcha: (phoneNumber: string) => Promise<ConfirmationResult>;
  confirmOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser && firebaseUser.phoneNumber) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            phoneNumber: firebaseUser.phoneNumber,
            createdAt: serverTimestamp(),
          });
        }
        
        setUser({
          uid: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber,
        });

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setupRecaptcha = (phoneNumber: string): Promise<ConfirmationResult> => {
     const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  }

  const confirmOtp = async (confirmationResult: ConfirmationResult, otp: string) => {
    await confirmationResult.confirm(otp);
    // onAuthStateChanged will handle the user creation/update
  }

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    // onAuthStateChanged will set user to null and loading to false
  };

  const value = {
    user,
    loading,
    setupRecaptcha,
    confirmOtp,
    logout,
  };

  if (loading && user === undefined) {
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
