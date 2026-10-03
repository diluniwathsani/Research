import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload as UploadIcon, File, Tag } from 'lucide-react';

export default function FileUpload({ onUploadSuccess }) {
  // State to hold the currently selected Excel file
  const [file, setFile] = useState(null);
  // State for Project Name
  const [projectName, setProjectName] = useState("");
  // State to manage the loading status while the file is being sent to the backend
  const [uploading, setUploading] = useState(false);
  // Reference to manually trigger or clear the hidden HTML file input
  const fileInputRef = useRef(null);

  // Triggered when a user selects a file (either by clicking or drag-and-drop)
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const [uploadError, setUploadError] = useState(null);

  // Sends the selected file to the backend server
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    
    // FormData is required to safely transmit files via HTTP requests
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_name', projectName.trim() || 'Project Research');

    try {
      // POST the file to the backend API
      await axios.post('http://localhost:3000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Clear the local state and file input after successful upload
      setFile(null);
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Notify the parent component (App.jsx) to refresh the table data
      onUploadSuccess();
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
            ? 'border-primary bg-primary/5' 
            : 'border-slate-300 dark:border-slate-600 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {file ? (
            <>
              <File className="w-8 h-8 mb-2 text-primary" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ready to upload</p>
            </>
          ) : (
            <>
              <UploadIcon className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-400" />
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
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
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="e.g. Project Research new"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              ⚠️ {uploadError}
            </div>
          )}

          <button 
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Uploading Data...</span>
              </>
            ) : (
              <>
                <UploadIcon size={18} />
                <span>Confirm & Upload Batch</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
