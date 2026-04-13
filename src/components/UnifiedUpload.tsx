import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { structureDocument } from '../services/gemini';

interface UnifiedUploadProps {
  onUploadSuccess: (data: any) => void;
}

type DocType = 'book' | 'curriculum' | 'guide' | 'grid';

interface FileState {
  file: File | null;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  error: string | null;
  progress: number;
}

export default function UnifiedUpload({ onUploadSuccess }: UnifiedUploadProps) {
  const [metadata, setMetadata] = useState({
    title: '',
    subject: '',
    grade: '',
    language: 'English'
  });

  const [files, setFiles] = useState<Record<DocType, FileState>>({
    book: { file: null, status: 'idle', error: null, progress: 0 },
    curriculum: { file: null, status: 'idle', error: null, progress: 0 },
    guide: { file: null, status: 'idle', error: null, progress: 0 },
    grid: { file: null, status: 'idle', error: null, progress: 0 }
  });

  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleFileChange = (type: DocType, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({
        ...prev,
        [type]: { ...prev[type], file: e.target.files![0], status: 'idle', error: null }
      }));
    }
  };

  const uploadSingleFile = async (type: DocType) => {
    const fileState = files[type];
    if (!fileState.file) return null;

    setFiles(prev => ({
      ...prev,
      [type]: { ...prev[type], status: 'uploading' }
    }));

    const formData = new FormData();
    formData.append('file', fileState.file);
    formData.append('type', type);
    formData.append('name', type === 'book' ? metadata.title : fileState.file.name);
    formData.append('subject', metadata.subject);
    formData.append('grades', metadata.grade);
    formData.append('language', metadata.language);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errData.error || 'Upload failed');
      }

      const uploadData = await response.json();
      
      setFiles(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'processing' }
      }));

      // Process with Gemini
      const structure = await structureDocument(uploadData.extractedText, type);

      // Save structure
      const saveResponse = await fetch('/api/save-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: uploadData.data.id,
          structure: structure
        })
      });

      if (!saveResponse.ok) throw new Error('Failed to save structure');

      setFiles(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'success' }
      }));

      return uploadData.data;
    } catch (err: any) {
      setFiles(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'error', error: err.message }
      }));
      throw err;
    }
  };

  const handleUploadAll = async () => {
    if (!files.book.file) {
      setGlobalError('At minimum, a book PDF is required.');
      return;
    }
    if (!metadata.title || !metadata.subject || !metadata.grade) {
      setGlobalError('Please fill in all metadata fields.');
      return;
    }

    setGlobalError(null);
    setIsUploadingAll(true);

    try {
      const uploadTypes = (Object.keys(files) as DocType[])
        .filter(type => files[type].file !== null);

      // Use allSettled to handle partial successes
      const results = await Promise.allSettled(uploadTypes.map(type => uploadSingleFile(type)));
      
      let successCount = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          onUploadSuccess(result.value);
          successCount++;
        }
      });

      if (successCount === 0) {
        setGlobalError('All uploads failed. Please check individual statuses.');
      } else if (successCount < uploadTypes.length) {
        setGlobalError(`Some uploads failed. Successfully processed ${successCount} files.`);
      }

    } catch (err: any) {
      setGlobalError('An unexpected error occurred during upload.');
    } finally {
      setIsUploadingAll(false);
    }
  };

  const renderUploadBox = (type: DocType, label: string, description: string, required?: boolean) => {
    const state = files[type];
    
    return (
      <div className={`relative group transition-all duration-300 ${state.status === 'success' ? 'opacity-75' : ''}`}>
        <label className={`
          relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${state.file 
            ? 'border-green-200 bg-green-50/30' 
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'}
          ${state.status === 'error' ? 'border-red-200 bg-red-50/30' : ''}
          ${state.status === 'uploading' || state.status === 'processing' ? 'animate-pulse border-blue-400' : ''}
        `}>
          {required && !state.file && (
            <span className="absolute top-4 right-4 text-[10px] font-bold text-orange-500 uppercase tracking-widest">Required</span>
          )}
          
          <div className={`p-4 rounded-2xl mb-4 transition-colors ${state.file ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-400 group-hover:text-blue-500'}`}>
            {state.status === 'uploading' || state.status === 'processing' ? (
              <Loader2 className="animate-spin" size={32} />
            ) : state.status === 'success' ? (
              <CheckCircle size={32} />
            ) : (
              <FileText size={32} />
            )}
          </div>

          <h4 className="font-bold text-gray-800 mb-1">{label}</h4>
          <p className="text-xs text-gray-500 text-center px-4">{state.file ? state.file.name : description}</p>
          
          <input 
            type="file" 
            accept=".pdf" 
            className="hidden" 
            onChange={(e) => handleFileChange(type, e)}
            disabled={isUploadingAll}
          />

          {state.status === 'error' && (
            <div className="absolute -bottom-6 left-0 right-0 text-center">
              <span className="text-[10px] text-red-500 font-medium">{state.error}</span>
            </div>
          )}
        </label>
        
        {state.file && state.status !== 'success' && !isUploadingAll && (
          <button 
            onClick={() => setFiles(prev => ({ ...prev, [type]: { ...prev[type], file: null, status: 'idle' } }))}
            className="absolute -top-2 -right-2 bg-white shadow-md rounded-full p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <AlertCircle size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="bg-[#FAF9F6] rounded-[2.5rem] p-12 border border-gray-100 shadow-xl shadow-gray-200/50 mb-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">Upload Teaching Materials</h2>
          <p className="text-gray-500 text-lg">Upload your documents to generate structured lesson plans. At minimum, a book PDF is required.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-800 ml-1">Book Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Mathematics Grade 8"
              value={metadata.title}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-700 font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-800 ml-1">Subject</label>
            <input 
              type="text" 
              placeholder="e.g. Mathematics"
              value={metadata.subject}
              onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-700 font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-800 ml-1">Grade Level</label>
            <input 
              type="text" 
              placeholder="e.g. Grade 8"
              value={metadata.grade}
              onChange={(e) => setMetadata(prev => ({ ...prev, grade: e.target.value }))}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-700 font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-800 ml-1">Target Language</label>
            <div className="flex bg-white border border-gray-200 rounded-2xl p-1">
              {['English', 'Nepali'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setMetadata(prev => ({ ...prev, language: lang }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    metadata.language === lang 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
          {renderUploadBox('book', 'Book PDF', 'The main textbook or resource', true)}
          {renderUploadBox('curriculum', 'Curriculum PDF', 'Official curriculum objectives')}
          {renderUploadBox('guide', 'Teacher Guide', 'Teaching instructions & methodology')}
          {renderUploadBox('grid', 'Specification Grid', 'Assessment specifications & weighting')}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleUploadAll}
            disabled={isUploadingAll || !files.book.file}
            className={`
              w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all
              ${isUploadingAll || !files.book.file
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#98B49D] text-white hover:bg-[#86A38B] shadow-lg shadow-green-900/10'}
            `}
          >
            {isUploadingAll ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Processing Materials...
              </>
            ) : (
              <>
                <Upload size={24} />
                Upload & Generate Lesson Plans
              </>
            )}
          </button>

          <AnimatePresence>
            {globalError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 text-red-500 font-bold text-sm"
              >
                <AlertCircle size={18} />
                {globalError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
