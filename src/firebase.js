// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb66vWgbNwQyiEe8ncowzuZeLqxSYGwSA",
  authDomain: "teacher-speakwell.firebaseapp.com",
  projectId: "teacher-speakwell",
  storageBucket: "teacher-speakwell.firebasestorage.app",
  messagingSenderId: "711960143388",
  appId: "1:711960143388:web:34c6ceae16ad07a29c21d9",
  measurementId: "G-W3D929DYF1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
