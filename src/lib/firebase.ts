// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "helpnow-r5cll",
  "appId": "1:571525603673:web:0f036ef3f289ac060d6c48",
  "storageBucket": "helpnow-r5cll.firebasestorage.app",
  "apiKey": "AIzaSyDvTubwY4voAhfia27K29jlhWx10BYLh_E",
  "authDomain": "helpnow-r5cll.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "571525603673"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
