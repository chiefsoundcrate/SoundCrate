// src/services/authService.js
import { 
  getAuth, 
  signOut,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  addDoc
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db, googleProvider } from "./firebase";

// Get Firebase Functions instance
const functions = getFunctions();

// No emulator connection in this version - we'll use production endpoints

// Function to send a verification code email
export const sendVerificationCode = async (email) => {
  try {
    const sendVerificationEmail = httpsCallable(functions, 'sendVerificationCode');
    const result = await sendVerificationEmail({ email });
    
    // Store email in session storage to remember it for verification
    sessionStorage.setItem('emailForVerification', email);
    
    return { success: result.data.success, message: result.data.message };
  } catch (error) {
    console.error("Error sending verification code:", error);
    // Try to extract a useful message from the backend response
    let message = error.message || "Failed to send verification code";
    if (error.details) message = error.details;
    if (error.code === 'functions/https-call-failed' && error.message) message = error.message;
    return { success: false, message };
  }
};

// Function to verify code and complete sign in
export const verifyCodeAndSignIn = async (email, code) => {
  try {
    const verifyCode = httpsCallable(functions, 'verifyCode');
    const result = await verifyCode({ email, code });
    
    if (result.data.success) {
      const auth = getAuth();
      
      // Sign in with the custom auth token returned from the function
      await signInWithCustomToken(auth, result.data.token);
      
      // Update or create user document in Firestore
      const db = getFirestore();
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userRef, {
          email: email,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          onWaitlist: false
        });
      } else {
        // Update last login
        await updateDoc(userRef, {
          lastLogin: serverTimestamp()
        });
      }
      
      return { 
        success: true, 
        message: "Authentication successful", 
        isNewUser: !userDoc.exists(),
        userId: auth.currentUser.uid
      };
    } else {
      return { success: false, message: result.data.message || "Invalid verification code" };
    }
  } catch (error) {
    console.error("Error verifying code:", error);
    return { 
      success: false, 
      message: error.message || "Failed to verify code" 
    };
  }
};

// Function to join the waitlist
export const joinWaitlist = async (userId) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, "users", userId);
    
    // Update the user document
    await updateDoc(userRef, {
      onWaitlist: true,
      waitlistJoinedAt: serverTimestamp()
    });
    
    // Trigger the waitlist confirmation email
    const sendWaitlistConfirmation = httpsCallable(functions, 'sendWaitlistConfirmation');
    await sendWaitlistConfirmation({ userId });
    
    return { success: true, message: "Successfully joined the waitlist" };
  } catch (error) {
    console.error("Error joining waitlist:", error);
    return { 
      success: false, 
      message: error.message || "Failed to join waitlist" 
    };
  }
};

// Sign up with email and password
export const signUpWithEmail = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Sign in with Google
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

// Sign out
export const signOutUser = async () => {
  await signOut(auth);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Add to waitlist (renamed from wishlist)
export const addToWaitlist = async (email, uid) => {
  try {
    // Add entry to the waitlist collection
    await addDoc(collection(db, "waitlist"), {
      email,
      uid,
      createdAt: serverTimestamp(),
    });
    
    // Also update the user document if it exists
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        onWaitlist: true,
        waitlistJoinedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    throw error; // Rethrow so component can handle the error
  }
};

// Function to check if user is on waitlist
export const checkWaitlistStatus = async (userId) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { 
        success: true, 
        onWaitlist: userDoc.data().onWaitlist || false 
      };
    } else {
      return { success: false, onWaitlist: false };
    }
  } catch (error) {
    console.error("Error checking waitlist status:", error);
    return { 
      success: false, 
      message: error.message || "Failed to check waitlist status", 
      onWaitlist: false 
    };
  }
};

export const addToWishlist = async (email, uid) => {
  await addDoc(collection(db, "wishlist"), {
    email,
    uid,
    createdAt: serverTimestamp(),
  });
};