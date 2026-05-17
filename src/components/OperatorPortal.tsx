import React from 'react';
import { 
  Terminal, 
  Activity, 
  Database, 
  RefreshCw, 
  Wifi, 
  Cpu, 
  ShieldCheck,
  Server,
  Cloud,
  FileCode
} from 'lucide-react';
import { ModulePage, ModuleCard } from './ModuleLayout';

export const OperatorPortal: React.FC = () => {
  const systemMetrics = [
    { label: 'Uptime', value: '99.9%', color: 'text-emerald-500' },
    { label: 'Latency', value: '24ms', color: 'text-blue-500' },
    { label: 'Storage', value: '1.2 GB', color: 'text-amber-500' },
  ];

  return (
    <ModulePage 
      title="Portal Operator" 
      subtitle="Data & System Engineering" 
      icon={<Terminal size={28} />} 
      color="bg-slate-800"
    >
      <div className="grid grid-cols-2 gap-4 mb-10">
        <ModuleCard 
            title="Sinkronisasi" 
            value="OK" 
            label="Last: 5m ago" 
            icon={<RefreshCw size={20} />} 
            color="bg-emerald-600" 
        />
        <ModuleCard 
            title="Data Center" 
            value="HUB" 
            label="Cloud Active" 
            icon={<Database size={20} />} 
            color="bg-blue-600" 
        />
      </div>

      <section className="mb-12">
        <h2 className="text-slate-900 dark:text-white font-black text-lg mb-6">System Health</h2>
        <div className="bg-white dark:bg-slate-800/80 rounded-[40px] border border-slate-50 dark:border-slate-700 soft-shadow p-8">
            <div className="grid grid-cols-3 gap-8">
                 {systemMetrics.map(metric => (
                   <div key={metric.label}>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{metric.label}</p>
                      <p className={`text-2xl font-black ${metric.color}`}>{metric.value}</p>
                   </div>
                 ))}
            </div>
            
            <div className="mt-12 space-y-6">
                {[
                    { label: 'Dapodik Integration', icon: <Cloud size={16} />, status: 'Connected' },
                    { label: 'PMP Online', icon: <Server size={16} />, status: 'Standby' },
                    { label: 'Security Firewall', icon: <ShieldCheck size={16} />, status: 'Active' },
                ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                                {item.icon}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">{item.status}</span>
                    </div>
                ))}
            </div>
        </div>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-black text-lg mb-6">Tools & Engineering</h2>
        <div className="grid grid-cols-2 gap-4">
             {[
               { label: 'API Logs', icon: <FileCode className="text-blue-500" /> },
               { label: 'DB Tools', icon: <Database className="text-amber-500" /> },
               { label: 'Hardware', icon: <Cpu className="text-purple-500" /> },
               { label: 'Network', icon: <Wifi className="text-cyan-500" /> },
             ].map(tool => (
               <button key={tool.label} className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-50 dark:border-slate-700 soft-shadow flex flex-col items-center gap-3 active:scale-95 transition-transform">
                  {tool.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tool.label}</span>
               </button>
             ))}
        </div>
      </section>
    </ModulePage>
  );
};
