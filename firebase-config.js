import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

import {
  getAuth
}
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  getFirestore
}
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyChA3HyR-wRvpQX1rYoFcpC4QBsMpmm2x8",
  authDomain: "planning-4c106.firebaseapp.com",
  projectId: "planning-4c106",
  storageBucket: "planning-4c106.firebasestorage.app",
  messagingSenderId: "57138484731",
  appId: "1:57138484731:web:51703733ddf21ea018675e",
  measurementId: "G-BJZF7927BC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);
```
