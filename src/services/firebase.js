import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAwdP7AwauyIMR4TLJ2ToKBIddTaoM44lg',
  authDomain: 'hcm-minigame.firebaseapp.com',
  databaseURL: 'https://hcm-minigame-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId: 'hcm-minigame',
  storageBucket: 'hcm-minigame.firebasestorage.app',
  messagingSenderId: '1093031190372',
  appId: '1:1093031190372:web:29292bde5ff64afd2ba471',
  measurementId: 'G-BJMYMMKGM4'
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

export { app, analytics, db };
