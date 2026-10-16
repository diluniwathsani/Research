import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload as UploadIcon, File, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FileUpload({ onUploadSuccess }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const ALLOWED_EXTENSIONS = ['.docx', '.doc', '.pdf', '.xlsx', '.xls', '.csv'];

  const validateFile = (selectedFile) => {
    if (!selectedFile) return { valid: false, error: null };

    const fileName = selectedFile.name || '';
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return {
        valid: false,
        error: "Unsupported file format. The file has no extension. Supported formats: Word (.docx, .doc), PDF (.pdf), Excel (.xlsx, .xls), or CSV (.csv)."
      };
    }

    const ext = fileName.substring(lastDotIndex).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file format (${ext}). Supported formats: Word (.docx, .doc), PDF (.pdf), Excel (.xlsx, .xls), or CSV (.csv).`
      };
    }

    if (selectedFile.size === 0) {
      return {
        valid: false,
        error: "Blank document detected. The uploaded file is empty (0 bytes). Please upload a valid requirements document."
      };
    }

    return { valid: true, error: null };
  };

  const handleFileChange = (e) => {
    setUploadError(null);
    setUploadSuccess(null);

    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadError(validation.error);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);
    setUploadSuccess(null);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const validation = validateFile(droppedFile);
      if (!validation.valid) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadError(validation.error);
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadError(validation.error);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    const formData = new FormData();
    formData.append('file', file);
    const effectiveProject = projectName.trim() || file.name.replace(/\.[^/.]+$/, '') || 'Project Research';
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
      setUploadSuccess(`Requirements document validated and uploaded successfully! (${res.data?.count || 0} requirements parsed)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUploadSuccess) {
        onUploadSuccess(res.data);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      const errMsg = err.response?.data?.error || err.message || 'File upload failed. Please verify backend server is running.';
      setUploadError(errMsg);
      setUploadSuccess(null);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 scale-[1.01] shadow-lg shadow-indigo-500/10'
            : file 
            ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' 
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {file ? (
            <>
              <File className="w-8 h-8 mb-2 text-indigo-500" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {file.name}
                <span className="text-xs font-normal text-slate-400">({formatFileSize(file.size)})</span>
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Ready to upload</p>
            </>
          ) : (
            <>
              <UploadIcon className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-400" />
              <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Supported formats: Word (.docx, .doc), PDF (.pdf), Excel (.xlsx, .xls), CSV (.csv)
              </p>
            </>
          )}
        </div>
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept=".docx, .doc, .pdf, .xlsx, .xls, .csv" 
          onChange={handleFileChange} 
        />
      </div>
      
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {uploading ? 'Validating & Uploading...' : 'Confirm & Upload Requirements'}
            </button>
            <button
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setUploadError(null);
              }}
              disabled={uploading}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              title="Remove selected file"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="w-full bg-rose-500/10 border-2 border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs flex items-start justify-between gap-3 font-semibold shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="shrink-0 text-rose-500 mt-0.5" />
            <div>
              <p className="font-extrabold text-[12px] uppercase tracking-wide text-rose-600 dark:text-rose-400">
                Document Upload Error
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-300/90 mt-0.5 leading-relaxed font-medium">
                {uploadError}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setUploadError(null)}
            className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-600 transition-colors"
            title="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="w-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl text-xs flex items-start justify-between gap-3 font-semibold shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-500 mt-0.5" />
            <div>
              <p className="font-extrabold text-[12px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Upload Successful
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-0.5 leading-relaxed font-medium">
                {uploadSuccess}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setUploadSuccess(null)}
            className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-400 hover:text-emerald-600 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
