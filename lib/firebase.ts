import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCr3ddxHE-oqLsS6pLZuzMxTIGrpDXjCWQ",
  authDomain: "graduation-morocco-app.firebaseapp.com",
  projectId: "graduation-morocco-app",
  storageBucket: "graduation-morocco-app.firebasestorage.app",
  messagingSenderId: "628763831557",
  appId: "1:628763831557:web:74dfb1b27433f8e7e9db6c",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
