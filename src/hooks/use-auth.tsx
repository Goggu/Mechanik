
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
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const fullUserData = userDoc.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            userType: fullUserData.userType,
            partnerType: fullUserData.partnerType,
          });
        } else {
            // This case might happen if user exists in auth but not in firestore db
            // Or if they are signing up for the first time
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            });
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

    const userData: Omit<User, "uid" | "email"> = { userType };
    if (userType === 'partner' && partnerType) {
        userData.partnerType = partnerType;
    }

    await setDoc(doc(db, "users", firebaseUser.uid), userData);

    setUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      ...userData
    });
  };

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
       setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        userType: userData.userType,
        partnerType: userData.partnerType,
      });
    } else {
        // Handle case where user exists in Auth but not Firestore
        throw new Error("User data not found in database.");
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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

// We need a Loader component to avoid icon not found errors
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
