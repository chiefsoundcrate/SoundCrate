// src/components/WaitlistForm.jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sendVerificationCode, verifyCodeAndSignIn, joinWaitlist } from '../services/authService';

const WaitlistForm = () => {
  const { currentUser, waitlistStatus } = useAuth();
  
  // Form states
  const [email, setEmail] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle email form submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await sendVerificationCode(email);
      
      if (result.success) {
        setMessage('Verification code sent! Check your email.');
        setShowVerification(true);
      } else {
        setError(result.message || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle verification code submission
  const handleVerifyAndJoin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Verify code and sign in
      const authResult = await verifyCodeAndSignIn(email, verificationCode);
      
      if (authResult.success) {
        setMessage('Verification successful. Joining waitlist...');
        
        // Step 2: Join waitlist
        const userId = authResult.userId;
        const waitlistResult = await joinWaitlist(userId);
        
        if (waitlistResult.success) {
          setSuccess(true);
          setMessage('You have successfully joined the waitlist! Check your email for confirmation.');
        } else {
          setError(waitlistResult.message || 'Failed to join waitlist');
        }
      } else {
        setError(authResult.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is already on waitlist
  if (currentUser && waitlistStatus) {
    return (
      <div className="text-center">
        <div className="bg-teal-400/20 text-teal-300 p-4 rounded-md mb-4" style={{fontFamily:"Inter"}}>
          <p className="">You're already on our waitlist!</p>
          <p className=" mt-1" style={{fontFamily:"Inter"}}>We'll notify you when SoundCrate launches.</p>
        </div>
      </div>
    );
  }

  // Successful submission state
  if (success) {
    return (
      <div className="text-center">
        <div className="bg-teal-400/20 text-teal-300 p-6 rounded-md mb-4">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-xl font-bold mb-2">You're on the list!</h3>
          <p>Thank you for joining our waitlist.</p>
          <p className="text-sm mt-4">Check your email for confirmation details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {!showVerification ? (
        // Step 1: Email input
        <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your E-mail"
            className="w-full sm:flex-grow py-3 px-4 bg-black border border-white/30 rounded-md focus:outline-none focus:border-[#29F2C0] text-white"
            disabled={isSubmitting}
          />
          <button 
            type="submit"
            className="w-full sm:w-auto bg-[#29F2C0] text-black py-2 px-8 rounded-md hover:opacity-90 transition-all font-bold disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Join'}
          </button>
        </form>
      ) : (
        // Step 2: Verification code
        <form onSubmit={handleVerifyAndJoin} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-white/80">Enter the 6-digit code sent to {email}</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="6-digit code"
              className="w-full py-3 px-4 bg-black border border-white/30 rounded-md focus:outline-none focus:border-[#29F2C0] text-white tracking-wider text-center text-lg"
              maxLength={6}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="w-full sm:flex-grow bg-[#29F2C0] text-black py-2 px-8 rounded-md hover:opacity-90 transition-all font-bold disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Verify & Join'}
            </button>
            
            <button
              type="button"
              onClick={() => setShowVerification(false)}
              className="w-full sm:w-auto bg-transparent border border-white/30 text-white py-2 px-8 rounded-md hover:border-white transition-all"
              disabled={isSubmitting}
            >
              Back
            </button>
          </div>
          
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={handleEmailSubmit}
              className="text-teal-400 hover:underline disabled:opacity-50"
              disabled={isSubmitting}
            >
              Didn't receive a code? Resend
            </button>
          </div>
        </form>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-500/20 text-red-300 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {message && !error && (
        <div className="mt-4 p-3 bg-teal-500/20 text-teal-300 rounded-md text-sm">
          {message}
        </div>
      )}
      
      <p className="text-sm text-gray-400 mt-4 text-center">
        Enter your email. No spam, we promise.
      </p>
    </div>
  );
};

export default WaitlistForm;