
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
import { auth } from "@/lib/firebase";
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
      if (firebaseUser) {
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
        // reCAPTCHA solved.
      }
    });
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  }

  const confirmOtp = async (confirmationResult: ConfirmationResult, otp: string) => {
    await confirmationResult.confirm(otp);
    // onAuthStateChanged will handle setting the user state.
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
