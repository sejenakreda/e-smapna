import React from 'react';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, subtitle, children, actions }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">{title}</h1>
            {subtitle && <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button className="p-2 text-gray-400">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};
