import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export interface GoogleSignInResult {
  user: User;
  accessToken: string;
}

export const googleSignIn = async (): Promise<GoogleSignInResult | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Geen Google OAuth access token ontvangen van Firebase Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error details:', error);

    // Provide friendly, actionable errors for iframe/preview and Docker environments
    if (error.code === 'auth/unauthorized-domain') {
      const currentHost = window.location.hostname;
      throw new Error(
        `Het preview-domein (${currentHost}) is nog niet toegevoegd aan de Geautoriseerde Domeinen in Firebase Console. Gebruik de 'Directe iCal Koppeling' hieronder (werkt 100% direct!), of draai de app via Docker op localhost:3000 waar dit standaard werkt.`
      );
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error(
        'De Google login popup is geblokkeerd door je browser of het preview iframe. Sta popups toe voor deze pagina, of gebruik de directe iCal koppeling.'
      );
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Het inlogvenster is gesloten voordat de login voltooid was.');
    }

    throw new Error(error.message || 'Onbekende fout bij inloggen met Google.');
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
