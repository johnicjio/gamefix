import React from 'react';

interface RetroShellProps {
  children: React.ReactNode;
  title: string;
}

const RetroShell: React.FC<RetroShellProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-mono p-4 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-8 flex items-center justify-between border-b-4 border-cyan-500 pb-4">
        <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          {title}
        </h1>
        <div className="flex gap-2">
           <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
           <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse delay-75" />
           <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-150" />
        </div>
      </header>
      
      <main className="w-full max-w-4xl flex-1 relative">
        <div className="absolute inset-0 bg-grid-slate-800/[0.2] -z-10" />
        {children}
      </main>
      
      <footer className="mt-8 text-slate-500 text-sm">
        POWERED BY RETROVERSE ENGINE v1.0
      </footer>
    </div>
  );
};

export default RetroShell;
