// SokoHub Firebase Configuration & Initialization
// Replace the config object below with your Firebase project credentials from https://console.firebase.google.com/

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "sokohub-kenya.firebaseapp.com",
    projectId: "sokohub-kenya",
    storageBucket: "sokohub-kenya.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase if CDN SDKs are loaded
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    window.db = firebase.firestore();
    window.storage = firebase.storage();
    console.log("SokoHub Firebase initialized successfully.");
} else {
    console.warn("Firebase SDK scripts not loaded yet.");
}
