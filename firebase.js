import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCkymKOrvjC8cobaJM5ghL32-rhBBg-Gas",
  authDomain: "my-snack-cd3cb.firebaseapp.com",
  databaseURL: "https://my-snack-cd3cb-default-rtdb.firebaseio.com",
  projectId: "my-snack-cd3cb",
  storageBucket: "my-snack-cd3cb.appspot.com",
  messagingSenderId: "709071649276",
  appId: "1:709071649276:web:2c69414361ed27790c5a79",
  measurementId: "G-9W2VQ59HFL",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

export { app, db, auth };
