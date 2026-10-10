import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload as UploadIcon, File, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FileUpload({ onUploadSuccess }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const [uploadError, setUploadError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    const effectiveProject = projectName.trim() || file.name.split('.')[0] || 'Project Research';
    formData.append('project_name', effectiveProject);
    formData.append('batch_name', effectiveProject);
    if (user?.email) {
      formData.append('user_email', user.email);
    }

    try {
      const email = user?.email || localStorage.getItem('user_email') || 'default';
      localStorage.setItem('active_requirements_batch', effectiveProject);
      localStorage.setItem(`active_requirements_batch_${email}`, effectiveProject);
      localStorage.setItem('active_project_name', effectiveProject);
    } catch (_) {}

    try {
      const res = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUploadSuccess) {
        onUploadSuccess(res.data);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      const errMsg = err.response?.data?.error || err.message || 'File upload failed. Please verify backend server is running.';
      setUploadError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4">
      <label 
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
          file 
            ? 'border-indigo-500 bg-indigo-50/20' 
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {file ? (
            <>
              <File className="w-8 h-8 mb-2 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ready to upload</p>
            </>
          ) : (
            <>
              <UploadIcon className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-400" />
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Excel files (.xlsx)</p>
            </>
          )}
        </div>
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept=".xlsx, .xls" 
          onChange={handleFileChange} 
        />
      </label>
      
      {file && (
        <div className="w-full space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Project Name (Target Project)
            </label>
            <div className="relative">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Project Research, E-Commerce Suite"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Confirm & Upload Requirements'}
          </button>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-rose-500 font-semibold">{uploadError}</p>
      )}
    </div>
  );
}
