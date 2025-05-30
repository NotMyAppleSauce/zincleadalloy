import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, push, limitToLast, orderByChild, query, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyABWeR2lngoKtE3X8eOnui4qJ96Q9_HNYI",
  authDomain: "horsestockmarket.firebaseapp.com",
  databaseURL: "https://horsestockmarket-default-rtdb.firebaseio.com",
  projectId: "horsestockmarket",
  storageBucket: "horsestockmarket.appspot.com",
  messagingSenderId: "396123315845",
  appId: "1:396123315845:web:931a8b681c4b2bfe2953ec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, onValue, set, update, push, limitToLast, orderByChild, query, get };