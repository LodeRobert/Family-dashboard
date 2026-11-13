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

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(s => provider.addScope(s));
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface GoogleAccountProfile {
  displayName: string;
  email: string;
  mode: 'firebase' | 'custom_gis';
}

export interface GoogleSignInResult {
  user: GoogleAccountProfile;
  accessToken: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (opts?: { prompt?: string }) => void;
          };
          revoke?: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gsi-client="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Kon Google Identity Services niet laden.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsiClient = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kon Google Identity Services script niet laden. Controleer je internetverbinding.'));
    document.head.appendChild(script);
  });
}

export const initAuth = (
  onAuthSuccess?: (user: GoogleAccountProfile, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) {
          onAuthSuccess(
            {
              displayName: user.displayName || 'Google Gebruiker',
              email: user.email || '',
              mode: 'firebase'
            },
            cachedAccessToken
          );
        }
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else if (!cachedAccessToken) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (customClientId?: string): Promise<GoogleSignInResult | null> => {
  const trimmedClientId = (customClientId || '').trim();

  // Mode 1: Direct Google OAuth via user's own Google Cloud Client ID (ideal for self-hosted Docker!)
  if (trimmedClientId) {
    try {
      isSigningIn = true;
      await loadGisScript();

      const accessToken = await new Promise<string>((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
          reject(new Error('Google OAuth client is niet beschikbaar in de browser.'));
          return;
        }

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: trimmedClientId,
          scope: SCOPES.join(' '),
          callback: response => {
            if (response.error) {
              reject(new Error(response.error_description || response.error || 'Google OAuth geweigerd.'));
              return;
            }
            if (!response.access_token) {
              reject(new Error('Geen access token ontvangen van Google.'));
              return;
            }
            resolve(response.access_token);
          },
          error_callback: err => {
            reject(
              new Error(
                err?.type === 'popup_closed'
                  ? 'Het inlogvenster is gesloten voordat de login voltooid was.'
                  : err?.type === 'popup_failed_to_open'
                  ? 'De Google login popup is geblokkeerd door je browser.'
                  : err?.message || 'Google OAuth fout.'
              )
            );
          }
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      });

      cachedAccessToken = accessToken;

      // Try to resolve primary calendar summary/id for friendly display
      let email = 'Google Agenda gekoppeld';
      let displayName = 'Google Account';
      try {
        const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (calRes.ok) {
          const calInfo = await calRes.json();
          if (calInfo.id) email = calInfo.id;
          if (calInfo.summary) displayName = calInfo.summary;
        }
      } catch {
        // ignore optional lookup
      }

      return {
        user: {
          displayName,
          email,
          mode: 'custom_gis'
        },
        accessToken
      };
    } catch (error: any) {
      console.error('Custom GIS sign in error:', error);
      throw new Error(error.message || 'Kon niet inloggen met je eigen Google Client ID.');
    } finally {
      isSigningIn = false;
    }
  }

  // Mode 2: Built-in Firebase Auth popup (works on localhost / authorized domains)
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Geen Google OAuth access token ontvangen van Firebase Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return {
      user: {
        displayName: result.user.displayName || 'Google Gebruiker',
        email: result.user.email || '',
        mode: 'firebase'
      },
      accessToken: cachedAccessToken
    };
  } catch (error: any) {
    console.error('Sign in error details:', error);

    if (error.code === 'auth/unauthorized-domain') {
      const currentOrigin = window.location.origin;
      throw new Error(
        `Dit adres (${currentOrigin}) is niet geautoriseerd voor de ingebouwde login. Vul bij Instellingen → Agenda's & Google Koppeling jouw eigen Google Cloud OAuth Client ID in (en voeg dit adres toe in Google Cloud Console), of gebruik de iCal-koppeling.`
      );
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error(
        'De Google login popup is geblokkeerd door je browser. Sta popups toe voor deze site of gebruik de iCal-koppeling.'
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
  if (cachedAccessToken && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(cachedAccessToken);
    } catch {
      // ignore revoke errors
    }
  }
  cachedAccessToken = null;
  try {
    await signOut(auth);
  } catch {
    // ignore if not signed in via firebase
  }
};
