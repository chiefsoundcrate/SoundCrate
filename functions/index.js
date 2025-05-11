/* eslint-env node */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
const db = admin.firestore();

// Get SendGrid API key and sender from environment config
const SENDGRID_API_KEY = functions.config().sendgrid && functions.config().sendgrid.key ? functions.config().sendgrid.key : null;
const SENDGRID_SENDER = functions.config().sendgrid && functions.config().sendgrid.sender ? functions.config().sendgrid.sender : null;
if (!SENDGRID_API_KEY || !SENDGRID_SENDER) {
  console.error("SendGrid API key or sender is not set in environment config.");
  throw new Error("SendGrid API key or sender is missing. Set it using 'firebase functions:config:set sendgrid.key=YOUR_KEY sendgrid.sender=YOUR_VERIFIED_EMAIL'.");
}
sgMail.setApiKey(SENDGRID_API_KEY);

// Helper: Generate a 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store code in Firestore with TTL
async function storeVerificationCode(email, code) {
  const ref = db.collection("email_verification_codes").doc(email);
  await ref.set({
    code,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes from now (ms)
  });
}

// Get and validate code from Firestore
async function validateVerificationCode(email, code) {
  const ref = db.collection("email_verification_codes").doc(email);
  const docSnap = await ref.get();
  if (!docSnap.exists) return { valid: false, reason: "Invalid or expired code" };
  const data = docSnap.data();
  if (data.code !== code) return { valid: false, reason: "Invalid verification code" };
  if (data.expiresAt < Date.now()) {
    await ref.delete();
    return { valid: false, reason: "Verification code expired" };
  }
  await ref.delete();
  return { valid: true };
}

// Send verification code email
exports.sendVerificationCode = functions.https.onCall(async (data, context) => {
  const { email } = data;
  if (!email) {
    return { success: false, message: "Email is required" };
  }
  try {
    const code = generateCode();
    await storeVerificationCode(email, code);
    const msg = {
      to: email,
      from: SENDGRID_SENDER,
      subject: "Your SoundCrate Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your SoundCrate Verification Code</h2>
          <p>Please use the following 6-digit code to verify your email:</p>
          <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 15 minutes.</p>
        </div>
      `
    };
    await sgMail.send(msg);
    return { success: true, message: "Verification code sent" };
  } catch (error) {
    console.error("SendGrid email error:", error && error.response && error.response.body ? error.response.body : error);
    return { success: false, message: `Failed to send verification code: ${error && error.response && error.response.body && error.response.body.errors ? error.response.body.errors.map(e => e.message).join('; ') : error.message || error.toString()}` };
  }
});

// Verify the code and sign in the user
exports.verifyCode = functions.https.onCall(async (data, context) => {
  const { email, code } = data;
  if (!email || !code) {
    return { success: false, message: "Email and code are required" };
  }
  try {
    const validation = await validateVerificationCode(email, code);
    if (!validation.valid) {
      return { success: false, message: validation.reason };
    }
    // Try to get user by email, create if not exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (error) {
      user = await admin.auth().createUser({ email, emailVerified: true });
    }
    // Create custom token for sign-in
    const token = await admin.auth().createCustomToken(user.uid);
    return {
      success: true,
      token,
      message: "Login successful",
      userId: user.uid
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, message: "Failed to authenticate: " + (error.message || error.toString()) };
  }
});

// Waitlist confirmation email
exports.sendWaitlistConfirmation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    return { success: false, message: "You must be signed in" };
  }
  const userId = context.auth.uid;
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return { success: false, message: "User not found" };
    }
    const userData = userDoc.data();
    const msg = {
      to: userData.email,
      from: SENDGRID_SENDER,
      subject: "Welcome to the SoundCrate Waitlist!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">You're on the list!</h2>
          <p>Thanks for joining the SoundCrate waitlist.</p>
          <p>We'll keep you updated. Stay tuned!</p>
          <p>The SoundCrate Team</p>
        </div>
      `
    };
    await sgMail.send(msg);
    return { success: true, message: "Confirmation email sent" };
  } catch (error) {
    console.error("Waitlist email error:", error && error.response && error.response.body ? error.response.body : error);
    return { success: false, message: `Failed to send waitlist email: ${error && error.response && error.response.body && error.response.body.errors ? error.response.body.errors.map(e => e.message).join('; ') : error.message || error.toString()}` };
  }
});