
import React, { useState } from 'react';
// FIX: Split imports from 'react-router-dom' and 'react-router' to handle potential module resolution issues.
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { MailIcon, LockIcon } from '../components/Icons';
import ThemeSwitcher from '../components/ThemeSwitcher';
import Spinner from '../components/ui/Spinner';

type AuthMode = 'signin' | 'signup' | 'reset';

const AdminLogin: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const navigate = useNavigate();

  const handleSwitch = (e: React.MouseEvent<HTMLElement>, path: string) => {
    e.preventDefault();
    setIsSwitching(true);
    setTimeout(() => {
        navigate(path);
    }, 300);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'signup') {
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }
        const validMasterKeys = ['55255525', '66366636'];
        if (!validMasterKeys.includes(masterKey)) {
            setError('Invalid Master Key.');
            setLoading(false);
            return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset link sent! Check your inbox.');
      }
    } catch (err: any) {
      let errorMessage = err.message;
       if (err.code) {
          switch (err.code) {
              case 'auth/user-not-found':
              case 'auth/invalid-credential':
                  errorMessage = 'Invalid email or password. Please try again.';
                  break;
              case 'auth/wrong-password':
                  errorMessage = 'Incorrect password. Please try again.';
                  break;
              case 'auth/email-already-in-use':
                  errorMessage = 'This email is already registered. Please sign in.';
                  break;
               case 'auth/unauthorized-domain':
                  errorMessage = 'This domain is not authorized for authentication. Please contact support.';
                  break;
              default:
                  errorMessage = err.message.replace('Firebase: ', '');
          }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const getTitle = () => {
    if (mode === 'signin') return 'Admin Sign In';
    if (mode === 'signup') return 'Create Admin Account';
    return 'Reset Password';
  }

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Spinner size="lg" />
        </div>
      )}
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className={`w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg relative animate-in fade-in-0 duration-500 ${isSwitching ? 'animate-out fade-out-0 duration-300 fill-forwards' : ''}`}>
          <div className="absolute top-4 right-4">
              <ThemeSwitcher />
          </div>
          <div className="text-center">
              <h1 className="text-3xl font-bold text-primary">Enterprise Forms</h1>
              <p className="text-muted-foreground mt-2">{getTitle()}</p>
          </div>
          
          {error && <p className="text-sm text-center text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
          {message && <p className="text-sm text-center text-green-500 bg-green-500/10 p-3 rounded-md">{message}</p>}


          <form onSubmit={handleAuthAction} className="space-y-4">
            <Input 
              type="email" 
              placeholder="Email address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              icon={<MailIcon className="w-5 h-5"/>}
            />
            {mode !== 'reset' && (
              <Input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                icon={<LockIcon className="w-5 h-5"/>}
              />
            )}
            {mode === 'signup' && (
              <>
                <Input 
                  type="password" 
                  placeholder="Confirm Password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required
                  icon={<LockIcon className="w-5 h-5"/>}
                />
                <Input 
                  type="text" 
                  placeholder="Master Key" 
                  value={masterKey} 
                  onChange={(e) => setMasterKey(e.target.value)} 
                  required
                  icon={<LockIcon className="w-5 h-5"/>}
                />
              </>
            )}
            <Button type="submit" loading={loading} loadingText="" className="w-full">
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button variant="secondary" onClick={handleGoogleSignIn} className="w-full" disabled={loading}>
            <svg className="mr-2 -ml-1 w-4 h-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.3 64.5C308.6 102.3 282.7 96 248 96c-106.1 0-192 85.9-192 192s85.9 192 192 192c100.9 0 183.1-78.1 190.4-176H248v-96h239.1c1.3 12.9 2.9 25.7 2.9 38.9z"></path></svg>
            Sign in with Google
          </Button>

          <div className="text-sm text-center text-muted-foreground">
            {mode === 'signin' && (
              <p>
                No account?{' '}
                <button onClick={() => setMode('signup')} className="font-medium text-primary hover:underline">Sign up</button>
                {' | '}
                <button onClick={() => setMode('reset')} className="font-medium text-primary hover:underline">Forgot password?</button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} className="font-medium text-primary hover:underline">Sign in</button>
              </p>
            )}
            {mode === 'reset' && (
              <p>
                Remembered your password?{' '}
                <button onClick={() => setMode('signin')} className="font-medium text-primary hover:underline">Sign in</button>
              </p>
            )}
          </div>
          
          <div className="text-center pt-4">
              <Link 
                  to="/user/login" 
                  onClick={(e) => handleSwitch(e, '/user/login')}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
              >
                  Looking for the participant portal?
              </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLogin;
