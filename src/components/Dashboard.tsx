import React, { useState, useEffect } from 'react';
import { Book, FileText, Layout, List, Plus, Sparkles, Clock, Loader2, Trash2 } from 'lucide-react';
import UploadCard from './UploadCard';
import DocumentDetails from './DocumentDetails';
import LessonPlanView from './LessonPlanView';
import LessonHistory from './LessonHistory';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [view, setView] = useState<'dashboard' | 'details' | 'plan' | 'history'>('dashboard');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newDoc: any) => {
    setDocuments([newDoc, ...documents]);
  };

  const handleViewDetails = (doc: any) => {
    setSelectedDoc(doc);
    setView('details');
  };

  const handleGenerateLesson = (plan: any) => {
    setSelectedPlan(plan);
    setView('plan');
  };

  const handleDeleteDoc = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  if (view === 'history') {
    return (
      <LessonHistory 
        onBack={() => setView('dashboard')} 
        onSelectPlan={(plan) => {
          setSelectedPlan(plan);
          setView('plan');
        }}
      />
    );
  }

  if (view === 'details' && selectedDoc) {
    return (
      <DocumentDetails 
        document={selectedDoc} 
        onBack={() => setView('dashboard')} 
        onGenerateLesson={handleGenerateLesson}
      />
    );
  }

  if (view === 'plan' && selectedPlan) {
    return (
      <LessonPlanView 
        plan={selectedPlan} 
        onBack={() => setView('details')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">EduPlan AI</h1>
            <p className="text-gray-500 font-medium">Generate intelligent lesson plans from your curriculum resources.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setView('history')}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-50 transition-all"
            >
              <Clock size={18} />
              History
            </button>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
              <Sparkles size={18} />
              Generate Plan
            </button>
          </div>
        </header>

        {/* Upload Grid */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Plus size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Upload Resources</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <UploadCard title="Book PDF" type="book" onUploadSuccess={handleUploadSuccess} />
            <UploadCard title="Curriculum" type="curriculum" onUploadSuccess={handleUploadSuccess} />
            <UploadCard title="Teacher Guide" type="guide" onUploadSuccess={handleUploadSuccess} />
            <UploadCard title="Spec Grid" type="grid" onUploadSuccess={handleUploadSuccess} />
          </div>
        </section>

        {/* Recent Documents */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Layout size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Recent Documents</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-bottom border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <LocalLoader className="animate-spin" size={24} />
                        <span className="text-sm font-medium">Loading documents...</span>
                      </div>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={32} strokeWidth={1.5} />
                        <span className="text-sm font-medium">No documents uploaded yet</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={doc.id} 
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            doc.type === 'book' ? 'bg-blue-50 text-blue-600' :
                            doc.type === 'curriculum' ? 'bg-purple-50 text-purple-600' :
                            doc.type === 'guide' ? 'bg-orange-50 text-orange-600' :
                            'bg-green-50 text-green-600'
                          }`}>
                            <Book size={16} />
                          </div>
                          <span className="font-medium text-gray-700">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold uppercase text-gray-400">{doc.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                          doc.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          doc.status === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleViewDetails(doc)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function LocalLoader({ className, size }: { className?: string; size?: number }) {
  return <Sparkles className={className} size={size} />;
}
