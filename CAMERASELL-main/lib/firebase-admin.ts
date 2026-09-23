import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

export function getAdminDb() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!getApps().length) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error("Missing Firebase Admin environment variables")
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  }

  return getFirestore()
}
