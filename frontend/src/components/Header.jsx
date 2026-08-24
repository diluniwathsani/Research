import React, { useState } from 'react';
import { Cpu, Search, Bell, Sun, Moon, User, CheckCircle2, ShieldAlert, Sparkles, ChevronDown } from 'lucide-react';

export default function Header({ isDark, setIsDark, activeTab, reqCount, onRefresh }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const moduleTitles = {
    dashboard: 'Executive Overview & Analytics',
    artifacts: 'Development Artifact Module',
    resources: 'Resource Management Module',
    projects: 'Project Management Module',
    changerequests: 'Change Request Module',
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 sticky top-0 z-40 shadow-sm transition-colors duration-200">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Left Section: Brand & Active Module Breadcrumb */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 p-2.5 rounded-xl shadow-md shadow-indigo-500/20 text-white">
              <Cpu size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
                  ReqEngine AI
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50">
                  v2.4 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {moduleTitles[activeTab] || 'Dashboard'}
              </p>
            </div>
          </div>
        </div>

        {/* Middle Section: Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search requirements, epics, user stories, or change requests..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-200 placeholder-slate-400 transition-all"
            />
          </div>
        </div>

        {/* Right Section: System Health, Actions, Theme & User */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* System Health Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>AI Pipeline Active</span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-white dark:ring-slate-800"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">System Notifications</h4>
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">3 New</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-64 overflow-y-auto">
                  <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 h-fit">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Dataset Loaded Successfully</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{reqCount} total requirements ready for ML analysis.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Just now</span>
                    </div>
                  </div>
                  <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 h-fit">
                      <ShieldAlert size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Incomplete Sentences Flagged</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sentences evaluated using spaCy dependency rules.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">10 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 pl-2 pr-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                DW
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                  Diluni W.
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-none">
                  Lead BA / Admin
                </span>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Diluni Wathsani</p>
                  <p className="text-[10px] text-slate-400">diluni@research.org</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2">
                  <User size={14} /> Profile & Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2">
                  <Sparkles size={14} /> AI Model Config
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
