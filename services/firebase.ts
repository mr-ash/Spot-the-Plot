import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    // @ts-ignore
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
    // @ts-ignore
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-domain",
    // @ts-ignore
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
    // @ts-ignore
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-bucket",
    // @ts-ignore
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "demo-sender",
    // @ts-ignore
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app",
    // @ts-ignore
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "demo-measurement-id"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics selectively (only supported in environments like the browser)
export let analytics: any = null;
isSupported().then((yes) => {
    if (yes) {
        analytics = getAnalytics(app);
    }
});
