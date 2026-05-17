import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { collection, query, where, getDocs, setDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../context/ConfigContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  Zap,
  RefreshCw,
  Fingerprint,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

export const StaffAttendance: React.FC = () => {
  const { profile } = useAuth();
  const { config } = useConfig();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'detecting' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Menyiapkan sistem...');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [inRange, setInRange] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setMessage('Memuat AI Models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setLoading(false);
        setMessage('Sistem siap');
      } catch (err) {
        console.error("Model load error:", err);
        setMessage('Gagal memuat sistem AI. Cek koneksi.');
      }
    };
    loadModels();
  }, []);

  // Check today's attendance
  useEffect(() => {
    if (!profile) return;
    const fetchAttendance = async () => {
      const today = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'staff_attendance', `${profile.uid}_${today}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setAttendanceToday(snap.data());
      }
    };
    fetchAttendance();
  }, [profile]);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setMessage('Geolokasi tidak didukung browser ini.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        if (config.schoolLatitude && config.schoolLongitude) {
          const d = calculateDistance(latitude, longitude, config.schoolLatitude, config.schoolLongitude);
          setDistance(Math.round(d));
          const range = config.attendanceRadius || 100;
          setInRange(d <= range);
        }
      },
      (err) => console.error("Geo error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [config]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Attach stream to video when active
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraActive, stream]);

  const startCamera = async () => {
    setMessage('Meminta izin kamera...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Izin kamera diblokir atau browser tidak mendukung akses kamera di mode ini. Pastikan Anda menggunakan HTTPS.");
      }

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error("Kamera hanya dapat digunakan di koneksi aman (HTTPS).");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      setStream(mediaStream);
      setCameraActive(true);
      setStatus('detecting');
      setMessage('Mencari wajah...');
    } catch (err: any) {
      console.error("Camera error:", err);
      setStatus('error');
      setMessage(`Gagal akses kamera: ${err.message || 'Izin ditolak'}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  };

  const registerFace = async () => {
    if (!videoRef.current || !profile) return;
    
    setStatus('verifying');
    setMessage('Mendaftarkan pola wajah...');
    
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Simpan descriptor ke Firestore user
        const descriptorArray = Array.from(detection.descriptor);
        await updateDoc(doc(db, 'users', profile.uid), {
          faceDescriptor: descriptorArray
        });
        
        alert("Wajah berhasil didaftarkan!");
        window.location.reload();
      } else {
        alert("Wajah tidak terdeteksi jelas. Pastikan cahaya cukup.");
        setStatus('detecting');
      }
    } catch (err: any) {
      alert("Gagal daftar wajah: " + err.message);
      setStatus('detecting');
    }
  };

  const verifyAndCheckIn = async () => {
    if (!videoRef.current || !profile || !profile.faceDescriptor) return;
    
    setStatus('verifying');
    setMessage('Menyocokkan wajah...');

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const storedDescriptor = new Float32Array(profile.faceDescriptor);
        const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
        
        console.log("Face Distance:", distance);

        if (distance < 0.45) { // Threshold for match
          processCheckIn();
        } else {
          setStatus('error');
          setMessage('Wajah tidak dikenali. Silakan coba lagi.');
          setTimeout(() => setStatus('detecting'), 3000);
        }
      } else {
        setMessage('Wajah tidak terdeteksi.');
        setTimeout(() => setStatus('detecting'), 2000);
      }
    } catch (err: any) {
      alert("Gagal verifikasi: " + err.message);
      setStatus('detecting');
    }
  };

  const processCheckIn = async () => {
    if (!profile || !location) return;

    setStatus('verifying');
    setMessage('Mengirim data absensi...');

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const docId = `${profile.uid}_${today}`;
      
      const attData = {
        uid: profile.uid,
        name: profile.name,
        date: today,
        updatedAt: serverTimestamp()
      };

      if (!attendanceToday?.checkIn) {
        // Is Check In
        const startTimeStr = config.attendanceStartTime || '07:00';
        const [startH, startM] = startTimeStr.split(':').map(Number);
        const tolerance = config.lateTolerance || 0;
        
        const limitTime = new Date(now);
        limitTime.setHours(startH, startM + tolerance, 0);

        const status = now > limitTime ? 'late' : 'on-time';
        
        await setDoc(doc(db, 'staff_attendance', docId), {
          ...attData,
          checkIn: {
            time: timeStr,
            lat: location.lat,
            lng: location.lng,
            status
          }
        }, { merge: true });
      } else {
        // Is Check Out
        await setDoc(doc(db, 'staff_attendance', docId), {
          ...attData,
          checkOut: {
            time: timeStr,
            lat: location.lat,
            lng: location.lng
          }
        }, { merge: true });
      }

      setStatus('success');
      setMessage('Absensi Berhasil!');
      stopCamera();
      
      // Update local state
      const updatedSnap = await getDoc(doc(db, 'staff_attendance', docId));
      setAttendanceToday(updatedSnap.data());

    } catch (err: any) {
      alert("Gagal absensi: " + err.message);
      setStatus('detecting');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center shadow-xl shadow-blue-500/20 mb-8 animate-bounce">
          <Fingerprint size={40} className="text-white" />
        </div>
        <Loader2 className="animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-black text-slate-900">{message}</h2>
        <p className="text-slate-400 text-sm mt-2">Pastikan koneksi internet stabil</p>
      </div>
    );
  }

  const isAlreadyCheckedOut = attendanceToday?.checkIn && attendanceToday?.checkOut;

  return (
    <div className="min-h-screen bg-mesh pb-24">
      <div className="pt-12 px-6">
        <header className="mb-10">
          <Link to="/absensi" className="w-12 h-12 bg-white rounded-2xl soft-shadow flex items-center justify-center text-slate-400 mb-8 hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.25em]">Portal Kehadiran</p>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Presensi Face ID</h1>
        </header>

        {/* Status Dashboard */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                 <Clock size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Check In</p>
              <h3 className="text-xl font-black text-slate-900">{attendanceToday?.checkIn?.time || '-- : --'}</h3>
              {attendanceToday?.checkIn?.status === 'late' && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black rounded-full border border-rose-100 uppercase tracking-widest">Terlambat</span>
              )}
           </div>
           
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                 <CheckCircle2 size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Check Out</p>
              <h3 className="text-xl font-black text-slate-900">{attendanceToday?.checkOut?.time || '-- : --'}</h3>
           </div>
        </div>

        {/* Main Camera Action Area */}
        <div className="bg-slate-900 rounded-[48px] overflow-hidden relative soft-shadow group aspect-[3/4] mb-8">
           {cameraActive ? (
             <div className="w-full h-full relative">
               <video 
                 ref={videoRef} 
                 autoPlay 
                 muted 
                 playsInline
                 className="w-full h-full object-cover scale-x-[-1]"
               />
               <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
               
               {/* Scanning Overlay */}
               <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                  <div className="w-full h-full rounded-[40px] border-2 border-white/30 border-dashed relative">
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse rounded-[38px]"></div>
                    <motion.div 
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                    />
                  </div>
               </div>
             </div>
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-white">
                <div className="w-24 h-24 rounded-[36px] bg-white/10 flex items-center justify-center mb-8">
                   <Fingerprint size={48} className="text-blue-400" />
                </div>
                {isAlreadyCheckedOut ? (
                  <div className="space-y-4">
                     <h2 className="text-2xl font-black">Absensi Selesai</h2>
                     <p className="text-slate-400 text-sm leading-relaxed">Terima kasih atas tugas hari ini. Anda sudah melakukan Check-Out.</p>
                  </div>
                ) : !inRange ? (
                  <div className="space-y-4 px-6">
                     <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                        Target: {config.schoolName}
                     </div>
                     <h2 className="text-2xl font-black">Luar Radius</h2>
                     <p className="text-slate-400 text-sm leading-relaxed">Anda berada {distance}m dari sekolah. Silakan mendekat ke area sekolah (Maks {config.attendanceRadius || 100}m).</p>
                  </div>
                ) : status === 'error' ? (
                  <div className="space-y-6 px-8">
                     <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
                        <XCircle size={40} />
                     </div>
                     <h2 className="text-xl font-black">Kendala Teknis</h2>
                     <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                     <button 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="px-6 py-3 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-colors"
                     >
                        Buka di Tab Baru
                     </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                     <h2 className="text-2xl font-black">Siap Absensi</h2>
                     <p className="text-slate-400 text-sm leading-relaxed">Silakan klik tombol di bawah untuk mulai pemindaian wajah.</p>
                  </div>
                )}
             </div>
           )}

           {/* Feedback UI */}
           <AnimatePresence>
             {status !== 'idle' && (
               <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: 20, opacity: 0 }}
                 className="absolute bottom-10 left-6 right-6"
               >
                 <div className="glass p-5 rounded-[32px] border border-white/20 flex items-center justify-center gap-4 text-center">
                    {status === 'verifying' ? <Loader2 className="animate-spin text-blue-500" /> : <ShieldCheck className="text-blue-500" />}
                    <span className="text-sm font-bold text-slate-800">{message}</span>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Action Button */}
        {!isAlreadyCheckedOut && inRange && (
          <div className="flex flex-col gap-4">
            {!cameraActive ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startCamera}
                className="w-full py-6 bg-blue-600 text-white rounded-[32px] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3"
              >
                <Camera size={20} />
                Mulai Kamera
              </motion.button>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={stopCamera}
                  className="w-16 h-16 bg-white rounded-[28px] soft-shadow flex items-center justify-center text-slate-400"
                >
                  <RefreshCw size={24} />
                </button>
                {profile?.faceDescriptor ? (
                  <button
                    onClick={verifyAndCheckIn}
                    disabled={status === 'verifying'}
                    className="flex-1 py-6 bg-emerald-600 text-white rounded-[32px] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/40"
                  >
                    {status === 'verifying' ? 'Verifikasi...' : (attendanceToday?.checkIn ? 'Check Out' : 'Check In')}
                  </button>
                ) : (
                  <button
                    onClick={registerFace}
                    disabled={status === 'verifying'}
                    className="flex-1 py-6 bg-orange-600 text-white rounded-[32px] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/40"
                  >
                    {status === 'verifying' ? 'Mendaftar...' : 'Daftar Wajah'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Location Info */}
        <div className="mt-8 p-6 bg-white/40 rounded-[32px] border border-white/50 flex items-center gap-4">
           <div className={cn(
             "w-10 h-10 rounded-2xl flex items-center justify-center",
             inRange ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
           )}>
              <MapPin size={20} />
           </div>
           <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Lokasi Anda</p>
              <p className="text-xs font-bold text-slate-700 leading-tight">
                {inRange ? "Berada di Area Sekolah" : `Luar Jangkauan (${distance}m)`}
              </p>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Radius Ops</p>
              <p className="text-xs font-bold text-slate-700">{config.attendanceRadius || 100}m</p>
           </div>
        </div>

        {/* Instruction Footer */}
        <div className="mt-8 text-center px-8">
           <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
             Sistem menggunakan Biometrik Pengenalan Wajah lokal. Data wajah disimpan dalam bentuk matematis (descriptor) demi privasi.
           </p>
        </div>
      </div>
    </div>
  );
};
