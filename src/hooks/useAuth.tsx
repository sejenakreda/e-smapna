import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isParent: false,
  login: async () => false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        setUser(fbUser);
        if (fbUser) {
          const docRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Migration: if roles doesn't exist but role does
            const roles = data.roles || (data.role ? [data.role] : ['student']);
            setProfile({ ...data, uid: docSnap.id, roles } as UserProfile);
          } else {
            // Fallback profiles for specific legacy accounts
            let defaultRoles: UserRole[] = ['student'];
            if (fbUser.email === 'redasejenak@gmail.com') {
              defaultRoles = ['admin'];
            }
            
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              roles: defaultRoles
            };

            const saved = localStorage.getItem('esmapna_user');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.uid === fbUser.uid || parsed.uid === 'admin-default') {
                 Object.assign(newProfile, parsed, { uid: fbUser.uid });
              }
            }

            // Create the missing document in Firestore
            try {
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            } catch (err) {
              console.error("Could not create missing profile doc:", err);
              // Set local profile anyway so UI works
              setProfile(newProfile);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth state initialization failed:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Spesifik untuk admin portal
      if (username === 'esmapna2026' && password === 'esmapna2026') {
        const email = 'redasejenak@gmail.com';
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          return !!cred.user;
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
             const cred = await signInAnonymously(auth);
             const adminProfile: UserProfile = {
               uid: cred.user.uid,
               email: 'redasejenak@gmail.com',
               name: 'Super Admin',
               roles: ['admin']
             };
             await setDoc(doc(db, 'users', cred.user.uid), adminProfile, { merge: true });
             setProfile(adminProfile);
             return true;
          }
          throw authErr;
        }
      }

      const email = username.includes('@') ? username : `${username}@smapna.com`;
      
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return !!cred.user;
      } catch (authErr: any) {
        console.warn("Login attempt failed:", authErr.code, authErr.message);
        
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
          // Check if this was a known legacy account sync attempt from server-side
          // We can't check Firestore from client while unauthenticated due to rules.
          throw new Error("User ID tidak ditemukan di sistem login. Admin harus melakukan 'Sinkronisasi' di Manajemen Pengguna.");
        }
        throw authErr;
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      // Custom messages
      if (err.code === 'auth/invalid-credential') {
        throw new Error("Kombinasi User ID dan Key tidak cocok.");
      }
      if (err.code === 'auth/user-not-found') {
        throw new Error("User ID belum terdaftar.");
      }
      throw err;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    localStorage.removeItem('esmapna_user');
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.roles?.includes('admin') || profile?.email === 'redasejenak@gmail.com' || false,
    isTeacher: profile?.roles?.some(r => ['teacher', 'kepsek', 'wakasek', 'bk', 'pembina', 'wakakur', 'wakasis', 'wakasar', 'wakahum'].includes(r)) || false,
    isStudent: profile?.roles?.includes('student') || false,
    isParent: profile?.roles?.includes('parent') || false,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
