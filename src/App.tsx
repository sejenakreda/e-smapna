/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ConfigProvider } from './context/ConfigContext';
import { Login } from './components/Login';
import { Springboard } from './components/Springboard';
import { AdminUsers } from './components/AdminUsers';
import { AdminSettings } from './components/AdminSettings';
import { AdminProfile } from './components/AdminProfile';
import { AcademicPortal } from './components/AcademicPortal';
import { StudentPortal } from './components/StudentPortal';
import { ClassPortal } from './components/ClassPortal';
import { GTKPortal } from './components/GTKPortal';
import { OperatorPortal } from './components/OperatorPortal';
import { 
  WakaKurikulumPortal, 
  WakaKesiswaanPortal, 
  WakaSarprasPortal, 
  WakaHumasPortal 
} from './components/WakaPortals';
import { SchoolPortalIndex } from './components/SchoolPortalIndex';
import { StaffAttendance } from './components/StaffAttendance';
import { AttendanceAdmin } from './components/AttendanceAdmin';
import { DownloadCenter } from './components/DownloadCenter';
import { PageLayout } from './components/PageLayout';
import { motion } from 'motion/react';
import { ArrowLeft, LayoutGrid } from 'lucide-react';

import { TUPortal } from './components/TUPortal';
import { ProtectedRoute } from './components/ProtectedRoute'; 
import PWAInstallPrompt from './components/PWAInstallPrompt';

const PlaceholderPage: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="min-h-screen bg-mesh pb-32">
     <div className="pt-12 px-6">
        <header className="mb-12">
            <Link to="/" className="w-12 h-12 bg-white rounded-2xl soft-shadow flex items-center justify-center text-slate-400 mb-8 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.25em] mb-1">{subtitle}</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        </header>

        <div className="bg-white/40 backdrop-blur-xl p-12 rounded-[48px] text-center border border-white/50 soft-shadow">
          <div className="w-24 h-24 bg-gradient-to-tr from-slate-50 to-slate-100 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
             <LayoutGrid size={40} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Modul Belum Siap</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-[240px] mx-auto leading-relaxed">System Architect sedang menyusun basis data untuk fitur {title}.</p>
          
          <Link to="/" className="inline-flex mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-900/10">
            Kembali ke Beranda
          </Link>
        </div>
     </div>
  </div>
);

export default function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <BrowserRouter>
          <PWAInstallPrompt />
          <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Springboard />
            </ProtectedRoute>
          } />

          <Route path="/portal" element={
            <ProtectedRoute>
              <SchoolPortalIndex />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute>
              <AdminProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/classes" element={
            <ProtectedRoute>
              <ClassPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/students" element={
            <ProtectedRoute>
              <StudentPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/gtk" element={
            <ProtectedRoute>
              <GTKPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/tu" element={
            <ProtectedRoute>
              <TUPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/operator" element={
            <ProtectedRoute>
              <OperatorPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/waka/kurikulum" element={
            <ProtectedRoute>
              <WakaKurikulumPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/waka/kesiswaan" element={
            <ProtectedRoute>
              <WakaKesiswaanPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/waka/sarpras" element={
            <ProtectedRoute>
              <WakaSarprasPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/waka/humas" element={
            <ProtectedRoute>
              <WakaHumasPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/academic" element={
            <ProtectedRoute>
              <AcademicPortal />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          } />

          {/* Attendance Routes */}
          <Route path="/absensi" element={
            <ProtectedRoute>
              <AttendanceAdmin />
            </ProtectedRoute>
          } />
          <Route path="/absensi/scan" element={
            <ProtectedRoute>
              <StaffAttendance />
            </ProtectedRoute>
          } />

          <Route path="/unduhan" element={
            <ProtectedRoute>
              <DownloadCenter />
            </ProtectedRoute>
          } />

          {/* Teacher Routes */}
          <Route path="/teacher/attendance" element={<ProtectedRoute><PlaceholderPage title="Absensi Siswa" subtitle="Teacher Portal" /></ProtectedRoute>} />
          <Route path="/teacher/grades" element={<ProtectedRoute><PlaceholderPage title="Input Nilai" subtitle="Teacher Portal" /></ProtectedRoute>} />
          <Route path="/teacher/schedule" element={<ProtectedRoute><PlaceholderPage title="Jadwal Mengajar" subtitle="Teacher Portal" /></ProtectedRoute>} />

          {/* Student/Parent Routes */}
          <Route path="/student/progress" element={<ProtectedRoute><PlaceholderPage title="Progres Akademik" subtitle="Student Portal" /></ProtectedRoute>} />
          <Route path="/student/homework" element={<ProtectedRoute><PlaceholderPage title="Tugas & PR" subtitle="Student Portal" /></ProtectedRoute>} />
          <Route path="/student/materials" element={<ProtectedRoute><PlaceholderPage title="Materi Pembelajaran" subtitle="Student Portal" /></ProtectedRoute>} />

          {/* Common Routes */}
          <Route path="/announcements" element={<ProtectedRoute><PlaceholderPage title="Pengumuman" subtitle="School Info" /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><PlaceholderPage title="Pesan Terintegrasi" subtitle="Communication" /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ConfigProvider>
  );
}
