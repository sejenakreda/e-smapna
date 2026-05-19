import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppConfig } from '../types';

interface ConfigContextType {
  config: AppConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const DEFAULT_CONFIG: AppConfig = {
  appName: 'E-SMAPNA',
  schoolLogo: 'logo_smapna.png',
  academicYear: '2025/2026',
  language: 'Bahasa Indonesia',
  theme: 'Modern Glass',
  darkMode: false,
  schoolName: 'SMAS PGRI Naringgul',
  npsnCode: '10293847',
  schoolContact: '0812-3456-7890',
  schoolAddress: 'Parigi Natal, Naringgul, Cianjur',
  principalName: 'Drs. H. Ahmad Fauzi',
  accreditation: 'A',
  opLicenseNumber: '421.3/2849-DPK/2016',
  establishedYear: '1984',
  semester: 'Genap',
  curriculum: 'Kurikulum Merdeka',
  majors: 'MIPA, IPS, Bahasa',
  totalClasses: '18 Rombel',
  kkmValue: '75.00',
  pushNotif: true,
  emailNotif: false,
  waGateway: true,
  autoAnnouncement: true,
  sessionType: 'Normal',
  loginTimeout: '30 Menit',
  deviceVerification: true,
  maintenanceMode: false,
  appVersion: 'v4.2.0-core',
  attendanceRadius: 100,
  schoolLatitude: -7.3332,
  schoolLongitude: 107.3284,
  attendanceStartTime: '07:00',
  attendanceEndTime: '14:00',
  lateTolerance: 30,
  pwaIconUrl: 'https://drive.google.com/file/d/1uOKSjAJH-I9U1O78Cd5Jp0Nrjkj9RWyX/view?usp=sharing',
  updatedAt: new Date()
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'app_config', 'main');
    
    // Subscribe to config changes
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        setConfig({ ...DEFAULT_CONFIG, ...data });
        
        // Apply some settings globally
        if (data.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Config fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshConfig = async () => {
    const docRef = doc(db, 'app_config', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as AppConfig);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
