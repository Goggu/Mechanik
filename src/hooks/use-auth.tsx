
"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type UserType = "public" | "partner";
type PartnerType = "male" | "female" | "trans";

interface User {
  uid: string;
  email: string | null;
  userType?: UserType;
  partnerType?: PartnerType;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (
    email: string,
    password: string,
    userType: UserType,
    partnerType?: PartnerType
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
            userType: userData.type,
            partnerType: userData['sub-type'],
          });
        } else {
           // This case can happen if a user is created in Auth but the Firestore doc creation fails.
           // Or for users created before the Firestore logic was in place.
           setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (
    email: string,
    password: string,
    userType: UserType,
    partnerType?: PartnerType
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;
    
    // Create user document in Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDataToSave: any = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        type: userType,
    };

    if (userType === 'partner' && partnerType) {
        userDataToSave['sub-type'] = partnerType;
    }

    await setDoc(userDocRef, userDataToSave);

    // Update local state
    setUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      userType: userType,
      partnerType: partnerType,
    });
  };

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Update local state with data from both Auth and Firestore
       setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        userType: userData.type,
        partnerType: userData['sub-type'],
      });
    } else {
        // Handle case where user exists in Auth but not Firestore
        throw new Error("User data not found in database. Please contact support.");
    }
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
