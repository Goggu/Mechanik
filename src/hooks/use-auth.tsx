
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

        // Ensure user document exists in Firestore
        if (!userDoc.exists()) {
          try {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              phoneNumber: firebaseUser.phoneNumber,
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            console.error("Error creating user document:", error);
          }
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
     // It is recommended to render the reCAPTCHA in an invisible container
     const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        // This callback is not always triggered for invisible reCAPTCHA.
      }
    });
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  }

  const confirmOtp = async (confirmationResult: ConfirmationResult, otp: string) => {
    // This will trigger onAuthStateChanged, which handles setting the user state
    // and creating the user document in Firestore.
    await confirmationResult.confirm(otp);
  }

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    // onAuthStateChanged will set user to null
  };

  const value = {
    user,
    loading,
    setupRecaptcha,
    confirmOtp,
    logout,
  };

  // Avoid rendering children until initial auth check is complete
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

    