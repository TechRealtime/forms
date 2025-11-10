import firebase from "firebase/compat/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// WARNING: It is strongly recommended to use environment variables for Firebase config keys in production.
const firebaseConfig = {
  apiKey: "AIzaSyALjfcgAitsr4RMlpRYVFbIStgpabRZhsk",
  authDomain: "formflow-pro-7d550.firebaseapp.com",
  projectId: "formflow-pro-7d550",
  storageBucket: "formflow-pro-7d550.appspot.com",
  messagingSenderId: "905107677113",
  appId: "1:905107677113:web:1cb62cfac564daaa196068",
  measurementId: "G-20KKT29K0"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };