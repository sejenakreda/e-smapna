export type UserRole = 
  | 'admin' 
  | 'kepsek' 
  | 'wakasek' 
  | 'waka_kurikulum'
  | 'waka_kesiswaan'
  | 'waka_sarpras'
  | 'waka_humas'
  | 'teacher' 
  | 'staff_tu' 
  | 'kepala_tu'
  | 'bendahara' 
  | 'operator' 
  | 'bk' 
  | 'pembina' 
  | 'student' 
  | 'parent';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  roles: UserRole[];
  classId?: string;
  faceDescriptor?: number[];
  nisn?: string;
  nipd?: string;
  nik?: string;
  noKK?: string;
  gender?: 'L' | 'P';
  pob?: string;
  dob?: string;
  agama?: string;
  address?: string;
  rt?: string;
  rw?: string;
  dusun?: string;
  kelurahan?: string;
  kecamatan?: string;
  kodePos?: string;
  jenisTinggal?: string;
  alatTransportasi?: string;
  telepon?: string;
  hp?: string;
  skhun?: string;
  penerimaKPS?: string;
  noKPS?: string;
  noPesertaUN?: string;
  noSeriIjazah?: string;
  penerimaKIP?: string;
  noKIP?: string;
  namaKIP?: string;
  noKKS?: string;
  noRegAktaLahir?: string;
  bank?: string;
  noRekening?: string;
  rekeningAtasNama?: string;
  layakPIP?: string;
  alasanLayakPIP?: string;
  kebutuhanKhusus?: string;
  sekolahAsal?: string;
  anakKe?: string;
  lintang?: string;
  bujur?: string;
  beratBadan?: string;
  tinggiBadan?: string;
  lingkarKepala?: string;
  jmlSaudaraKandung?: string;
  jarakSekolah?: string;
  angkatan?: string;
  status?: string;
  
  // Data GTK Specific
  nuptk?: string;
  npa?: string; // Nomor Pokok Anggota / NIP
  npwp?: string;
  pangkat?: string;
  golongan?: string;
  tugasTambahan?: string;
  statusKepegawaian?: string; // PNS, PPPK, GTY, GTT, Honorer
  pendidikanTerakhir?: string;
  programStudi?: string;
  tahunLulus?: string;
  tmptLahir?: string;
  tglLahir?: string;
  
  // Sertifikasi
  noSertifikasi?: string;
  jenisSertifikasi?: string; // PPG Daljab, PPG Prajab
  tahunSertifikasi?: string;
  bidangStudiSertifikasi?: string;
  
  // Riwayat Kerja
  tmtPegawai?: string;
  tmtGuru?: string;
  instansiTugas?: string;
  
  // Data Ayah
  fatherName?: string;
  fatherBirthYear?: string;
  fatherEducation?: string;
  fatherJob?: string;
  fatherIncome?: string;
  fatherNIK?: string;
  
  // Data Ibu
  motherName?: string;
  motherBirthYear?: string;
  motherEducation?: string;
  motherJob?: string;
  motherIncome?: string;
  motherNIK?: string;
  
  // Data Wali
  guardianName?: string;
  guardianBirthYear?: string;
  guardianEducation?: string;
  guardianJob?: string;
  guardianIncome?: string;
  // System Fields
  createdAt?: any;
  updatedAt?: any;
}

export interface AppConfig {
  // General
  appName: string;
  schoolLogo: string;
  academicYear: string;
  language: string;
  theme: string;
  darkMode: boolean;
  
  // School
  schoolName: string;
  npsnCode: string;
  schoolContact: string;
  schoolAddress: string;
  principalName: string;
  accreditation: string;
  opLicenseNumber: string;
  establishedYear: string;
  kopSuratUrl?: string;
  pwaIconUrl?: string;
  
  // Academic
  semester: string;
  curriculum: string;
  majors: string;
  totalClasses: string;
  kkmValue: string;
  
  // Notifications
  pushNotif: boolean;
  emailNotif: boolean;
  waGateway: boolean;
  autoAnnouncement: boolean;
  
  // Security
  sessionType: string;
  loginTimeout: string;
  deviceVerification: boolean;
  
  // System
  maintenanceMode: boolean;
  appVersion: string;
  attendanceRadius?: number;
  schoolLatitude?: number;
  schoolLongitude?: number;
  attendanceStartTime?: string;
  attendanceEndTime?: string;
  lateTolerance?: number;
  updatedAt: any;
}

export interface ArchiveItem {
  uid: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null; // null for root
  gtkId?: string; // Relation to GTK
  url?: string;
  size?: number;
  mimeType?: string;
  createdAt: any;
  createdBy: string;
  description?: string;
  category?: 'GTK' | 'KEUANGAN' | 'SISWA' | 'SK' | 'LAINNYA';
}
