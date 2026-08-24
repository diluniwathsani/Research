import React from 'react';
import { Cpu, ShieldCheck, Heart, ExternalLink, Activity } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700/80 py-4 px-6 mt-auto text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Side: System Info & Copyright */}
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Cpu size={16} />
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              AI-Driven Requirement Engineering Platform
            </p>
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} Dialog Axiata PLC — Research & NLP Systems
            </p>
          </div>
        </div>

        {/* Center: System Status Indicator */}
        <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-900/50 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">System Status: Operational</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-indigo-500" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">RFC 2119 Validation Enabled</span>
          </div>
        </div>

        {/* Right Side: Quick Links */}
        <div className="flex items-center space-x-4">
          <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
            Documentation <ExternalLink size={12} />
          </a>
          <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
            API Health
          </a>
          <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
            Research Guide
          </a>
        </div>

      </div>
    </footer>
  );
}
