import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import { getAuth, type Auth } from "firebase/auth"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAEXYj965-Vp6K-E-TdeqYxTTQFWuHkE7I",
  authDomain: "may-anh-daeda.firebaseapp.com",
  projectId: "may-anh-daeda",
  storageBucket: "may-anh-daeda.firebasestorage.app",
  messagingSenderId: "120908784917",
  appId: "1:120908784917:web:0b4b522816d6d95af4751c",
  measurementId: "G-HKRXK5K4D4"
};

// ✅ Kiểm tra nếu app đã được khởi tạo, dùng lại app cũ — tránh duplicate
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const db: Firestore = getFirestore(app)
export const storage: FirebaseStorage = getStorage(app)
export const auth: Auth = getAuth(app)

export { app }
