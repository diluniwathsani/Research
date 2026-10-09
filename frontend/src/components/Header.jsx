import React, { useState } from 'react';
import { 
  Cpu, Search, Bell, Sun, Moon, User, CheckCircle2, ShieldAlert, Sparkles, 
  ChevronDown, LogOut, LogIn, Mail, RefreshCw, FolderGit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ isDark, setIsDark, activeTab, reqCount, onRefresh, projects = [], selectedProjectId, onSelectProject }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, signOut, setIsAuthModalOpen, authNotice } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const moduleTitles = {
    artifacts: 'Development Artifact Module',
    projects: 'Project Management Module',
    resources: 'Resource Management Module',
    changerequests: 'Change Request Module',
    dashboard: 'Executive Overview & Analytics',
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 sticky top-0 z-40 shadow-sm transition-colors duration-200">
      
      {/* Auth Toast Notification Banner */}
      {authNotice && (
        <div className={`px-4 py-1.5 text-xs text-center font-medium transition-all ${
          authNotice.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
        }`}>
          {authNotice.msg}
        </div>
      )}

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
                  ReqEngine
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50">
                  Research Platform
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {moduleTitles[activeTab] || 'Dashboard'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: System Health, Actions, Theme & User */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* System Health Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>System Online</span>
          </div>

          {/* Sync / Refresh Button */}
          <button
            onClick={handleRefreshClick}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
            title="Refresh Data from Backend"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""} />
          </button>

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
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Workspace Active</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{reqCount} requirements loaded for your account.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Just now</span>
                    </div>
                  </div>
                  <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 h-fit">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">NLP Engine Ready</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">AI syntax and dependency analyzer connected.</p>
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

          {/* User Profile / Auth Control */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 pl-2 pr-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {user?.avatar || 'VP'}
                </div>
                <div className="hidden sm:block text-left max-w-[130px] truncate">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight truncate">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-none truncate">
                    {user?.email || 'user@research.org'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in duration-150">
                  {/* Account Header */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.name}</p>
                      {user?.provider === 'google' ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                          Google
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          Local Account
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                  </div>

                  {/* Actions */}
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                  >
                    <User size={14} className="text-indigo-500" /> Switch / Register Another Account
                  </button>
                  
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all transform active:scale-95"
            >
              <LogIn size={15} />
              <span>Sign In / Sign Up</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
