import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import * as admin from "firebase-admin";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Firebase Admin lazily
  let adminDb: any = null;
  let adminAuth: any = null;

  function getAdmin() {
    if (!adminAuth) {
      try {
        console.log("Initializing Firebase Admin...");
        let firebaseApp;
        
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          console.log("Using provided FIREBASE_SERVICE_ACCOUNT...");
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          if (getApps().length === 0) {
            firebaseApp = initializeApp({
              credential: cert(serviceAccount),
              projectId: serviceAccount.project_id
            });
          } else {
            firebaseApp = getApp();
          }
        } else {
          console.log("No service account found in ENV, using default ambient initialization...");
          if (getApps().length === 0) {
            firebaseApp = initializeApp();
          } else {
            firebaseApp = getApp();
          }
        }

        adminAuth = getAuth(firebaseApp);
        
        // Get database ID from config if possible
        let databaseId = "";
        try {
          const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
          if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            databaseId = config.firestoreDatabaseId || "";
          }
        } catch (e) {
          console.warn("Could not read firebase-applet-config.json for databaseId, using default");
        }
        
        adminDb = databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp);

        // Ensure master admin exists
        const email = 'redasejenak@gmail.com';
        adminAuth.getUserByEmail(email)
          .then(() => console.log("Master admin verified."))
          .catch(async (e: any) => {
            if (e.code === 'auth/user-not-found') {
              console.log("Master admin not found, creating...");
              try {
                await adminAuth!.createUser({
                  email,
                  password: 'esmapna2026',
                  displayName: 'Super Admin',
                });
                console.log("Master admin created successfully.");
              } catch (createErr: any) {
                console.error("Failed to create master admin:", createErr.message);
              }
            }
          });

        // Initialize App Config if missing
        if (adminDb) {
          const configRef = adminDb.collection('app_config').doc('main');
          configRef.get()
            .then(async (doc: any) => {
              if (!doc.exists) {
                console.log("Initializing default app config...");
                try {
                  await configRef.set({
                    appName: 'E-SMAPNA',
                    schoolLogo: 'logo_smapna.png',
                    academicYear: '2023/2024 Genap',
                    schoolName: 'SMAS PGRI Naringgul',
                    attendanceRadius: 100,
                    schoolLatitude: -7.3332,
                    schoolLongitude: 107.3284,
                    attendanceStartTime: '07:00',
                    attendanceEndTime: '14:00',
                    lateTolerance: 30,
                    pwaIconUrl: 'https://drive.google.com/file/d/1uOKSjAJH-I9U1O78Cd5Jp0Nrjkj9RWyX/view?usp=sharing',
                    updatedAt: FieldValue.serverTimestamp()
                  });
                } catch (setErr: any) {
                  console.warn("Failed to set initial app config:", setErr.message);
                }
              }
            })
            .catch((err: any) => {
              console.warn("Could not initialize app config (likely rules or index):", err.message);
            });
        }

      } catch (err: any) {
        console.error("Firebase Admin initialization fatal error:", err.message);
      }
    }
    return { adminAuth, adminDb };
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dynamic PWA Manifest
  app.get("/manifest.json", async (req, res) => {
    const { adminDb: db } = getAdmin();
    let appConfig = {
      appName: 'E-SMAPNA',
      pwaIconUrl: '/icon.png'
    };

    if (db) {
      try {
        const configDoc = await db.collection('app_config').doc('main').get();
        if (configDoc.exists) {
          const data = configDoc.data();
          if (data.appName) appConfig.appName = data.appName;
          if (data.pwaIconUrl) {
            let iconUrl = data.pwaIconUrl;
            if (iconUrl.includes('drive.google.com')) {
              const fileId = iconUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || 
                           iconUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
              if (fileId) {
                // Use the thumbnail link which acts as a direct image link for PWA
                iconUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
              }
            }
            appConfig.pwaIconUrl = iconUrl;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch manifest config from DB:", e);
      }
    }

    const manifest = {
      id: 'com.smapna.app.v1',
      name: appConfig.appName,
      short_name: appConfig.appName,
      description: 'Sistem Informasi Sekolah Terpadu SMAPNA',
      theme_color: '#2563eb',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      categories: ['education', 'productivity'],
      icons: [
        {
          src: appConfig.pwaIconUrl,
          sizes: '72x72',
          type: 'image/png'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '96x96',
          type: 'image/png'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '128x128',
          type: 'image/png'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '144x144',
          type: 'image/png'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '152x152',
          type: 'image/png'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '180x180',
          type: 'image/png'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: appConfig.pwaIconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      shortcuts: [
        {
          name: appConfig.appName,
          short_name: appConfig.appName,
          description: 'Sistem Informasi Sekolah Terpadu SMAPNA',
          url: '/',
          icons: [{ src: appConfig.pwaIconUrl, sizes: '192x192' }]
        }
      ]
    };

    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(manifest, null, 2));
  });

  // Create User in Firebase Auth
  app.post("/api/admin/create-user", async (req, res) => {
    const { adminAuth: clientAuth } = getAdmin();
    if (!clientAuth) {
      return res.status(500).json({ error: "Firebase Admin is not configured. Please add FIREBASE_SERVICE_ACCOUNT to your environment variables." });
    }

    try {
      const { email, password, displayName } = req.body;
      
      // Check if user already exists
      try {
        const existingUser = await clientAuth.getUserByEmail(email);
        return res.json({ uid: existingUser.uid });
      } catch (e) {
        // User doesn't exist, proceed to create
      }
      
      const userRecord = await clientAuth.createUser({
        email,
        password: password || 'smapna123',
        displayName: displayName || email.split('@')[0],
      });

      res.json({ uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete User from Auth and Firestore
  app.post("/api/admin/delete-user", async (req, res) => {
    console.log("POST /api/admin/delete-user called");
    const { adminAuth: clientAuth, adminDb: db } = getAdmin();
    
    if (!clientAuth) {
      console.error("Delete failed: Admin Auth not initialized");
      return res.status(500).json({ error: "Firebase Admin Auth is not initialized. Check server logs." });
    }

    try {
      const { uid } = req.body;
      if (!uid) {
        console.error("Delete failed: Missing UID in request body");
        return res.status(400).json({ error: "UID is required" });
      }

      console.log(`Attempting to delete user ${uid}...`);

      const results = {
        authDeleted: false,
        firestoreDeleted: false,
        error: null as string | null
      };

      // 1. Delete from Auth
      try {
        await clientAuth.deleteUser(uid);
        console.log(`Auth user ${uid} deleted.`);
        results.authDeleted = true;
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          console.log(`Auth user ${uid} not found in Auth, skipping.`);
          results.authDeleted = true; // Count as "deleted" since it's not there
        } else {
          console.error(`Error deleting Auth user ${uid}:`, e.message);
          results.error = "Auth: " + e.message;
        }
      }

      // 2. Delete from Firestore
      if (db) {
        try {
          await db.collection('users').doc(uid).delete();
          console.log(`Firestore doc ${uid} deleted.`);
          results.firestoreDeleted = true;
        } catch (e: any) {
          console.error(`Error deleting Firestore doc ${uid}:`, e.message);
          results.error = (results.error ? results.error + " | " : "") + "Firestore: " + e.message;
        }
      } else {
        console.warn("Firestore Admin not initialized, skipping doc delete");
      }

      if (results.error && !results.authDeleted && !results.firestoreDeleted) {
        return res.status(500).json(results);
      }

      res.json({ success: true, ...results });
    } catch (error: any) {
      console.error("Fatal error in delete-user endpoint:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk Sync Endpoint
  app.post("/api/admin/sync-users", async (req, res) => {
    const { adminAuth: clientAuth, adminDb: db } = getAdmin();
    if (!clientAuth) {
      console.error("Sync failed: Admin SDK not initialized");
      return res.status(500).json({ error: "Admin SDK not ready. Check FIREBASE_SERVICE_ACCOUNT." });
    }

    try {
      const { users } = req.body;
      console.log(`Syncing ${users?.length || 0} users...`);
      const results = [];

      for (const user of users) {
        try {
          const email = user.email.includes('@') ? user.email : `${user.email}@e-smapna.sch.id`;
          const nisn = user.nisn;
          
          let existingUid = null;
          let status = 'exists';

          // 1. Try to find by NISN in Firestore first (most reliable ID)
          if (db && nisn) {
            const snap = await db.collection('users').where('nisn', '==', nisn).limit(1).get();
            if (!snap.empty) {
              existingUid = snap.docs[0].id;
              console.log(`Found existing user by NISN ${nisn}: ${existingUid}`);
            }
          }

          // 2. Try to find by Email in Auth if NISN lookup failed
          if (!existingUid) {
            try {
              const authUser = await clientAuth.getUserByEmail(email);
              existingUid = authUser.uid;
              console.log(`Found existing user by Email ${email}: ${existingUid}`);
            } catch (e: any) {
              if (e.code !== 'auth/user-not-found') throw e;
            }
          }

          if (existingUid) {
            // Update Firestore doc if needed or ensure it exists
            if (db) {
              const userRef = db.collection('users').doc(existingUid);
              const userDoc = await userRef.get();
              
              const updateData = {
                uid: existingUid,
                email: email,
                name: user.name,
                roles: user.roles || ['student'],
                nisn: nisn || null,
                ...user,
                updatedAt: FieldValue.serverTimestamp()
              };

              if (!userDoc.exists) {
                console.log(`Creating missing Firestore doc for existing user: ${email}`);
                await userRef.set({
                  ...updateData,
                  createdAt: FieldValue.serverTimestamp(),
                });
              } else {
                // We update it to ensure sync
                await userRef.update(updateData);
              }
            }
            results.push({ email, name: user.name, status: 'exists', uid: existingUid });
          } else {
            // 3. Create new user
            const created = await clientAuth.createUser({
              email: email,
              password: 'smapna123',
              displayName: user.name
            });

            // Create Firestore doc
            if (db) {
              await db.collection('users').doc(created.uid).set({
                uid: created.uid,
                email: email,
                name: user.name,
                roles: user.roles || ['student'],
                nisn: nisn || null,
                ...user,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
              });
            }

            results.push({ email, name: user.name, status: 'created', uid: created.uid });
            console.log(`Created new user: ${email}`);
          }
        } catch (err: any) {
          console.error(`Error syncing user ${user.email}:`, err.message);
          results.push({ email: user.email, name: user.name, status: 'error', message: err.message });
        }
      }
      res.json(results);
    } catch (error: any) {
      console.error("Master Sync Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
