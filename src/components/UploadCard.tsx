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
  const [subject, setSubject] = useState('');
  const [grades, setGrades] = useState('');
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
    if (!file || !subject || !grades) {
      setError('Please fill in all fields and select a file');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('name', file.name);
    formData.append('subject', subject);
    formData.append('grades', grades);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || 'Upload failed');
        } else {
          const text = await response.text();
          console.error("Non-JSON error response:", text);
          throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Unexpected non-JSON response:", text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
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

      const saveContentType = saveResponse.headers.get("content-type");
      if (!saveResponse.ok) {
        if (saveContentType && saveContentType.includes("application/json")) {
          const errData = await saveResponse.json();
          throw new Error(errData.error || 'Failed to save structure');
        } else {
          const text = await saveResponse.text();
          throw new Error(`Server error (${saveResponse.status}): ${text.substring(0, 100)}`);
        }
      }

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

      <div className="flex-1 flex flex-col gap-4">
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

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Subject</label>
            <input 
              type="text" 
              placeholder="e.g. Mathematics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
              {type === 'book' ? 'Grade' : 'Grades (comma separated)'}
            </label>
            <input 
              type="text" 
              placeholder={type === 'book' ? "e.g. 5" : "e.g. 3, 4, 5"}
              value={grades}
              onChange={(e) => setGrades(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
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
