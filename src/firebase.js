// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDbSIDCfXNGpKifvhV126frr-blOtytXEA",
  authDomain: "guidelink-rwanda.firebaseapp.com",
  projectId: "guidelink-rwanda",
  storageBucket: "guidelink-rwanda.firebasestorage.app",
  messagingSenderId: "354144844756",
  appId: "1:354144844756:web:65818ecb3f380d7966b441",
  measurementId: "G-164GLYTZ3E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
