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
  Clock,
  FileText,
  Calendar as CalendarIcon,
  Plus,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { StaffAttendance as StaffAttType, LeaveRequest } from '../types';

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
  const [attendanceToday, setAttendanceToday] = useState<StaffAttType | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  
  const [view, setView] = useState<'attendance' | 'history' | 'leave'>('attendance');
  const [isDinasLuar, setIsDinasLuar] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [monthlyAttendance, setMonthlyAttendance] = useState<StaffAttType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const [leaveForm, setLeaveForm] = useState<Partial<LeaveRequest>>({
    type: 'Izin',
    startDate: '',
    endDate: '',
    reason: '',
  });

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

  // Check today's attendance and history
  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      const now = new Date();
      const jakartaDateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Jakarta', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(now);

      const docRef = doc(db, 'staff_attendance', `${profile.uid}_${jakartaDateStr}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setAttendanceToday(snap.data() as StaffAttType);
      } else {
        setAttendanceToday(null);
      }

      // Fetch last 30 days for history
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      const historyQuery = query(
        collection(db, 'staff_attendance'),
        where('uid', '==', profile.uid),
        where('date', '>=', lastMonth.toISOString().split('T')[0])
      );
      const historySnap = await getDocs(historyQuery);
      setMonthlyAttendance(historySnap.docs.map(d => d.data() as StaffAttType));

      // Fetch leave requests
      const leaveQuery = query(
        collection(db, 'leave_requests'),
        where('uid', '==', profile.uid)
      );
      const leaveSnap = await getDocs(leaveQuery);
      setLeaveRequests(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() }) as LeaveRequest));
    };
    fetchData();
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
    let active = true;
    const bindStream = async () => {
      if (cameraActive && stream && videoRef.current) {
        try {
          console.log("Binding stream to video element...");
          videoRef.current.srcObject = stream;
          // Important: explicitly call play() and wait for it
          await videoRef.current.play();
          console.log("Video playing successfully");
          if (active) {
            setStatus('detecting');
            setMessage('Mencari wajah...');
          }
        } catch (err) {
          console.error("Video play error:", err);
          if (active) {
            setStatus('error');
            setMessage('Gagal memutar video. Silakan tekan tombol "Refresh Kamera" di bawah atau pastikan izin kamera diberikan.');
          }
        }
      }
    };
    
    bindStream();
    return () => { active = false; };
  }, [cameraActive, stream]);

  const startCamera = async () => {
    setMessage('Meminta izin kamera...');
    setStatus('idle'); // Clear previous error
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser Anda memblokir kamera atau tidak mendukung fitur ini. Pastikan Anda menggunakan Chrome/Safari dan koneksi HTTPS.");
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
      // Use standard detector for registration (more accurate)
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.3 })
      )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Capture a reference photo for the GTK profile
        let photo = null;
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Respect the mirroring used in the preview
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);
            photo = canvas.toDataURL('image/jpeg', 0.7);
          }
        }

        // Simpan descriptor, photo, dan timestamp ke Firestore user
        const descriptorArray = Array.from(detection.descriptor);
        await updateDoc(doc(db, 'users', profile.uid), {
          faceDescriptor: descriptorArray,
          faceRegistrationPhoto: photo,
          faceRegistrationDate: serverTimestamp()
        });
        
        alert("Face ID berhasil dikonversi dan disimpan ke profil Anda.");
        window.location.reload();
      } else {
        alert("Wajah tidak terdeteksi jelas. Pastikan cahaya cukup (tidak terlalu gelap/silau) dan wajah menghadap kamera.");
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
      // Use slightly more sensitive detector for low light
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.25 })
      )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const storedDescriptor = new Float32Array(profile.faceDescriptor);
        const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
        
        console.log("Face Distance:", distance);

        if (distance < 0.5) { // Slightly more relaxed threshold (0.45 -> 0.5) to account for morning lighting
          processCheckIn();
        } else {
          setStatus('error');
          setMessage('Wajah tidak dikenali. Dekati lampu atau bersihkan lensa kamera.');
          setTimeout(() => setStatus('detecting'), 4000);
        }
      } else {
        setMessage('Wajah tidak terdeteksi. Usahakan wajah terkena cahaya lampu.');
        setTimeout(() => setStatus('detecting'), 3000);
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
      const today = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Jakarta', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(now);
      
      const timeStr = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      });

      const docId = `${profile.uid}_${today}`;
      
      const attData: any = {
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
        
        attData.checkIn = {
          time: timeStr,
          lat: location.lat,
          lng: location.lng,
          status,
          isOutsideRadius: isDinasLuar,
          verificationType: 'face'
        };
        attData.status = isDinasLuar ? 'Dinas Luar' : 'Hadir';

        await setDoc(doc(db, 'staff_attendance', docId), attData, { merge: true });
        
        if (status === 'late') {
           alert("Anda Terlambat! Pastikan ini menjadi evaluasi ke depan.");
        }
      } else {
        // Is Check Out
        attData.checkOut = {
          time: timeStr,
          lat: location.lat,
          lng: location.lng
        };
        await setDoc(doc(db, 'staff_attendance', docId), attData, { merge: true });
      }

      setStatus('success');
      setMessage('Absensi Berhasil!');
      stopCamera();
      
      // Update local state
      const updatedSnap = await getDoc(doc(db, 'staff_attendance', docId));
      setAttendanceToday(updatedSnap.data() as StaffAttType);

    } catch (err: any) {
      alert("Gagal absensi: " + err.message);
      setStatus('detecting');
    }
  };

  const submitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) return;

    setLoading(true);
    try {
      const data = {
        ...leaveForm,
        uid: profile.uid,
        name: profile.name,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(collection(db, 'leave_requests')), data);
      alert("Pengajuan berhasil dikirim!");
      setIsLeaveModalOpen(false);
      
      // Refresh leave requests
      const leaveQuery = query(
        collection(db, 'leave_requests'),
        where('uid', '==', profile.uid)
      );
      const leaveSnap = await getDocs(leaveQuery);
      setLeaveRequests(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() }) as LeaveRequest));
    } catch (err: any) {
      alert("Gagal kirim pengajuan: " + err.message);
    } finally {
      setLoading(false);
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

  const renderAttendanceView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Status Dashboard */}
        <div className="grid grid-cols-2 gap-4">
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
        <div className="bg-slate-900 rounded-[48px] overflow-hidden relative soft-shadow group aspect-[3/4]">
           {cameraActive ? (
             <div className="w-full h-full relative">
               <video 
                 ref={videoRef} 
                 autoPlay 
                 muted 
                 playsInline
                 className="w-full h-full object-cover scale-x-[-1]"
                 style={{ minHeight: '100%', minWidth: '100%' }}
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
                     <p className="text-slate-400 text-sm leading-relaxed mb-6">Terima kasih atas tugas hari ini. Anda sudah melakukan Check-Out.</p>
                     <button 
                       onClick={() => setView('history')}
                       className="px-8 py-3 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all inline-block"
                     >
                       Lihat Riwayat Log
                     </button>
                  </div>
                ) : (!inRange && !isDinasLuar) ? (
                  <div className="space-y-4 px-6">
                     <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                        Target: {config.schoolName}
                     </div>
                     <h2 className="text-2xl font-black">Luar Radius</h2>
                     <p className="text-slate-400 text-sm leading-relaxed">Anda berada {distance}m dari sekolah. Jika Anda bertugas di luar, aktifkan mode "Dinas Luar".</p>
                     <button 
                        onClick={() => setIsDinasLuar(true)}
                        className="px-6 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
                     >
                        Aktifkan Dinas Luar
                     </button>
                  </div>
                ) : status === 'error' ? (
                  <div className="space-y-6 px-8">
                     <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
                        <XCircle size={40} />
                     </div>
                     <h2 className="text-xl font-black">Kendala Teknis</h2>
                     <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                     <div className="flex gap-2 justify-center">
                       <button 
                          onClick={() => {
                            stopCamera();
                            startCamera();
                          }}
                          className="px-6 py-3 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                       >
                          Refresh Kamera
                       </button>
                       <button 
                          onClick={() => setView('history')}
                          className="px-6 py-3 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-colors"
                       >
                          Cek Log
                       </button>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                     <h2 className="text-2xl font-black">Siap Absensi</h2>
                     <p className="text-slate-400 text-sm leading-relaxed">Silakan klik tombol di bawah untuk mulai pemindaian wajah. {isDinasLuar && <span className="text-amber-400 block mt-2 font-bold">(Mode Dinas Luar Aktif)</span>}</p>
                     <button 
                       onClick={() => setView('history')}
                       className="text-[10px] text-blue-400 font-bold hover:underline"
                     >
                       Lihat riwayat log absensi saya
                     </button>
                  </div>
                )}
             </div>
           )}


           {/* Feedback UI */}
           <AnimatePresence>
             {status !== 'idle' && (
               <motion.div 
                 key={`status-feedback-panel-${status}`}
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
        {!isAlreadyCheckedOut && (inRange || isDinasLuar) && (
          <div className="flex flex-col gap-4">
            {!cameraActive ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startCamera}
                className={cn(
                  "w-full py-6 text-white rounded-[32px] text-sm font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3",
                  isDinasLuar ? "bg-amber-600 shadow-amber-500/40" : "bg-blue-600 shadow-blue-500/40"
                )}
              >
                <Camera size={20} />
                Mulai Kamera {isDinasLuar ? '(Dinas Luar)' : ''}
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

        {/* Dynamic Warning for Late */}
        {!attendanceToday?.checkIn && (
           <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
              <div className="text-amber-600 mt-1">
                 <AlertTriangle size={20} />
              </div>
              <div>
                 <p className="text-xs font-bold text-amber-900 mb-1">Peringatan Keterlambatan</p>
                 <p className="text-[10px] text-amber-700 leading-relaxed italic">Batas waktu check-in adalah jam {config.attendanceStartTime}. Jika lewat dari itu, Anda akan tercatat terlambat.</p>
              </div>
           </div>
        )}

        {/* Location Info */}
        <div className="p-6 bg-white/40 rounded-[32px] border border-white/50 flex items-center gap-4">
           <div className={cn(
             "w-10 h-10 rounded-2xl flex items-center justify-center",
             inRange ? "bg-emerald-50 text-emerald-600" : (isDinasLuar ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600")
           )}>
              <MapPin size={20} />
           </div>
           <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Lokasi Anda</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-700 leading-tight">
                  {isDinasLuar ? "Mode Dinas Luar Aktif" : (inRange ? "Berada di Area Sekolah" : `Luar Jangkauan (${distance}m)`)}
                </p>
              </div>
           </div>
           {!inRange && (
             <button 
               onClick={() => setIsDinasLuar(!isDinasLuar)}
               className={cn(
                 "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-colors",
                 isDinasLuar ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
               )}
             >
               {isDinasLuar ? "Batal Dinas Luar" : "Pilih Dinas Luar"}
             </button>
           )}
        </div>
    </div>
  );

  const renderHistoryView = () => {
    const sortedDays = [...monthlyAttendance].sort((a,b) => b.date.localeCompare(a.date));
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-black text-slate-900">Rekap 30 Hari</h2>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Unduh Laporan</button>
         </div>

         {/* Calendar Rekap Tiles */}
         <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 30 }).map((_, i) => {
               const d = new Date();
               d.setDate(d.getDate() - (29 - i));
               const dateStr = d.toISOString().split('T')[0];
               const att = monthlyAttendance.find(a => a.date === dateStr);
               
               let color = "bg-slate-100";
               if (att) {
                 if (att.status === 'Sakit' || att.status === 'Izin') color = "bg-amber-400";
                 else if (att.status === 'Dinas Luar') color = "bg-indigo-500";
                 else if (att?.checkIn?.status === 'late') color = "bg-rose-500";
                 else color = "bg-emerald-500";
               } else if (d.getDay() === 0 || d.getDay() === 6) {
                 color = "bg-slate-200";
               }

               return (
                 <div key={i} className={cn("aspect-square rounded-lg transition-transform hover:scale-110 cursor-help", color)} title={dateStr}></div>
               );
            })}
         </div>

         <div className="space-y-3">
            {sortedDays.map((att, i) => (
              <div key={`att-log-${att.date}-${i}`} className="bg-white p-4 rounded-2xl border border-slate-100 soft-shadow flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      att.checkIn?.status === 'late' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                    )}>
                       <Clock size={18} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{att.date}</p>
                       <p className="text-xs font-bold text-slate-900">{att.checkIn?.time || '--'} - {att.checkOut?.time || '--'}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-widest",
                      att.checkIn?.status === 'late' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                    )}>
                       {att.status || (att.checkIn?.status === 'late' ? 'TERLAMBAT' : 'HADIR')}
                    </span>
                 </div>
              </div>
            ))}
         </div>
      </div>
    );
  };

  const renderLeaveView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Izin & Sakit</h2>
          <button 
             onClick={() => setIsLeaveModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
          >
             <Plus size={14} /> Baru
          </button>
       </div>

       {leaveRequests.length === 0 ? (
         <div className="bg-white py-12 rounded-[32px] border border-slate-100 text-center px-8">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 flex items-center justify-center rounded-3xl mx-auto mb-4">
               <FileText size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Belum ada pengajuan</h3>
            <p className="text-xs text-slate-500 leading-relaxed italic">Anda bisa mengajukan Izin, Sakit atau Dinas Luar jika berhalangan hadir ke sekolah.</p>
         </div>
       ) : (
         <div className="space-y-3">
            {leaveRequests.map((req, i) => (
              <div key={`leave-req-${req.id || i}`} className="bg-white p-5 rounded-[28px] border border-slate-100 soft-shadow">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className={cn(
                         "w-8 h-8 rounded-lg flex items-center justify-center",
                         req.type === 'Sakit' ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-600"
                       )}>
                          <FileText size={14} />
                       </div>
                       <h4 className="text-sm font-black text-slate-900">{req.type}</h4>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-widest",
                      req.status === 'approved' ? "bg-emerald-50 text-emerald-600" : (req.status === 'rejected' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400")
                    )}>
                      {req.status}
                    </span>
                 </div>
                 <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-[10px]">
                       <span className="text-slate-400">Tanggal</span>
                       <span className="font-bold text-slate-700">{req.startDate} s/d {req.endDate}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] text-slate-400">Alasan</span>
                       <p className="text-xs text-slate-600 italic leading-relaxed">{req.reason}</p>
                    </div>
                 </div>
              </div>
            ))}
         </div>
       )}
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh pb-32">
      <div className="pt-12 px-6">
        <header className="mb-10">
          <Link to="/absensi" className="w-12 h-12 bg-white rounded-2xl soft-shadow flex items-center justify-center text-slate-400 mb-8 hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.25em]">Portal Kehadiran</p>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Presensi Mandiri</h1>
            </div>
            <div className="w-12 h-12 bg-white rounded-2xl soft-shadow flex items-center justify-center text-blue-600">
               <UserCheck size={24} />
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex p-1.5 bg-slate-100 rounded-3xl mb-8">
           <button 
             onClick={() => setView('attendance')}
             className={cn(
               "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all",
               view === 'attendance' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
             )}
           >
              Absen
           </button>
           <button 
             onClick={() => setView('history')}
             className={cn(
               "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all",
               view === 'history' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
             )}
           >
              Rekap
           </button>
           <button 
             onClick={() => setView('leave')}
             className={cn(
               "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all",
               view === 'leave' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
             )}
           >
              Izin
           </button>
        </div>

        {view === 'attendance' && renderAttendanceView()}
        {view === 'history' && renderHistoryView()}
        {view === 'leave' && renderLeaveView()}

        {/* Leave Request Modal */}
        <AnimatePresence>
           {isLeaveModalOpen && (
             <div key="leave-request-modal-overlay" className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4">
                <motion.div 
                   key="leave-modal-backdrop"
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   onClick={() => setIsLeaveModalOpen(false)}
                   className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div 
                   initial={{ y: 100, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ y: 100, opacity: 0 }}
                   className="relative bg-white w-full max-w-md rounded-[40px] overflow-hidden"
                >
                   <div className="p-8">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="text-xl font-black text-slate-900">Form Pengajuan</h3>
                         <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-rose-500">
                            <XCircle size={24} />
                         </button>
                      </div>

                      <form onSubmit={submitLeaveRequest} className="space-y-5">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Jenis Pengajuan</label>
                            <div className="grid grid-cols-3 gap-2">
                               {['Sakit', 'Izin', 'Dinas Luar'].map(t => (
                                 <button
                                   key={t}
                                   type="button"
                                   onClick={() => setLeaveForm({...leaveForm, type: t as any})}
                                   className={cn(
                                     "py-3 rounded-xl text-[10px] font-bold transition-all border",
                                     leaveForm.type === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-100"
                                   )}
                                 >
                                    {t}
                                 </button>
                               ))}
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Tgl Mulai</label>
                               <input 
                                 type="date" 
                                 required
                                 value={leaveForm.startDate}
                                 onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})}
                                 className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold"
                               />
                            </div>
                            <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Tgl Selesai</label>
                               <input 
                                 type="date" 
                                 required
                                 value={leaveForm.endDate}
                                 onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})}
                                 className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold"
                               />
                            </div>
                         </div>

                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Alasan / Keterangan</label>
                            <textarea 
                               required
                               rows={3}
                               value={leaveForm.reason}
                               onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                               placeholder="Contoh: Sakit demam, Ada keperluan keluarga, Rapat di Dinas..."
                               className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-xs font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20"
                            />
                         </div>

                         <button 
                            type="submit"
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 active:scale-95 transition-all mt-4"
                         >
                            Kirim Pengajuan
                         </button>
                      </form>
                   </div>
                </motion.div>
             </div>
           )}
        </AnimatePresence>

        {/* Instruction Footer */}
        <div className="mt-8 text-center px-8 flex flex-col gap-3">
           <p className="text-[10px] text-blue-600 font-black uppercase tracking-wider bg-blue-50 py-2 px-4 rounded-xl border border-blue-100">
             Tips Pagi Hari: Pastikan wajah menghadap lampu. Jangan membelakangi cahaya (Silau).
           </p>
           <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
             Sistem menggunakan Biometrik Pengenalan Wajah lokal. Data wajah disimpan dalam bentuk matematis (descriptor) demi privasi.
           </p>
        </div>
      </div>
    </div>
  );
};
