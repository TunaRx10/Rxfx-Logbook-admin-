import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDiAmEKb2xNq4sqrwZ2W8qJPs47T1izr0",
  authDomain: "rxfx-logbook-38944.firebaseapp.com",
  projectId: "rxfx-logbook-38944",
  storageBucket: "rxfx-logbook-38944.firebasestorage.app",
  messagingSenderId: "587977763986",
  appId: "1:587977763986:web:3ca86cc69f5fe6463cca4b",
  measurementId: "G-HJC7L0X586"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedFirebase() {
  console.log('--- Seeding Firebase ---');

  // 1. Initial User
  try {
    await setDoc(doc(db, "users", "admin-user-1"), {
      display_name: "Admin RxFx",
      email: "admin@rxfx.com",
      status: "active",
      role: "admin",
      created_at: new Date().toISOString()
    });
    console.log('Admin user seeded');
  } catch (e) { console.error('Error seeding user:', e); }

  // 2. Initial Boutique Product
  try {
    await addDoc(collection(db, "boutique_inventory"), {
      name: "T-Shirt RXFX Elite",
      price: 45,
      colors: ["#000000", "#00FFFF"],
      image: "",
      stock: 100,
      created_at: new Date().toISOString()
    });
    console.log('Boutique product seeded');
  } catch (e) { console.error('Error seeding boutique:', e); }

  // 3. Initial Transaction
  try {
    await addDoc(collection(db, "transactions"), {
      user_id: "admin-user-1",
      amount: 100,
      type: "deposit",
      status: "completed",
      description: "Initial deposit",
      created_at: new Date().toISOString()
    });
    console.log('Initial transaction seeded');
  } catch (e) { console.error('Error seeding transaction:', e); }

  console.log('--- Firebase Seeding Complete ---');
}

seedFirebase();
