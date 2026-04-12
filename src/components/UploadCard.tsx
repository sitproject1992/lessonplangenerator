import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { structureDocument } from '../services/gemini';

interface UploadCardProps {
  title: string;
  type: 'book' | 'curriculum' | 'guide' | 'grid';
  onUploadSuccess: (data: any) => void;
}

export default function UploadCard({ title, type, onUploadSuccess }: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('name', file.name);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const uploadData = await response.json();
      
      // Now process with Gemini on frontend
      setStatus('processing');
      const structure = await structureDocument(uploadData.extractedText, type);

      // Save structure back to backend
      const saveResponse = await fetch('/api/save-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: uploadData.data.id,
          structure: structure
        })
      });

      if (!saveResponse.ok) throw new Error('Failed to save document structure');

      setStatus('success');
      onUploadSuccess(uploadData.data);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
          <FileText size={20} />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {!file ? (
          <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
            <Upload className="text-gray-400 group-hover:text-blue-500 mb-2" size={24} />
            <span className="text-sm text-gray-500 group-hover:text-blue-600 font-medium">Click to upload PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileText className="text-blue-500 shrink-0" size={18} />
              <span className="text-sm text-gray-700 font-medium truncate">{file.name}</span>
            </div>
            <button 
              onClick={() => setFile(null)}
              className="text-xs text-gray-400 hover:text-red-500 font-medium"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || status === 'processing' || status === 'success'}
          className={`w-full py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            status === 'success' 
              ? 'bg-green-500 text-white' 
              : status === 'uploading' || status === 'processing'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : !file
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
          }`}
        >
          {status === 'uploading' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Uploading...
            </>
          ) : status === 'processing' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Analyzing...
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle size={18} />
              Uploaded
            </>
          ) : (
            'Upload Document'
          )}
        </button>

        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 text-red-500 text-xs font-medium"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
