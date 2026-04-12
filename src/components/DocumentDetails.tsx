import React, { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Sparkles, Loader2, ArrowLeft, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { generateLessonPlan } from '../services/gemini';

interface DocumentDetailsProps {
  document: any;
  onBack: () => void;
  onGenerateLesson: (topic: any) => void;
}

export default function DocumentDetails({ document, onBack, onGenerateLesson }: DocumentDetailsProps) {
  const [structure, setStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStructure();
  }, [document.id]);

  const fetchStructure = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('content_structure')
        .select('*')
        .eq('document_id', document.id)
        .order('chapter_name', { ascending: true });

      if (error) throw error;
      setStructure(data || []);
    } catch (err) {
      console.error('Error fetching structure:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (topic: any) => {
    if (!supabase) {
      alert('Supabase is not configured. Please check your environment variables.');
      return;
    }
    setGeneratingId(topic.id);
    try {
      // 1. Get full topic info with document name
      const { data: topicData, error: topicError } = await supabase
        .from('content_structure')
        .select('*, documents(*)')
        .eq('id', topic.id)
        .single();

      if (topicError) throw topicError;

      // 2. Generate with Gemini on frontend
      const lessonPlan = await generateLessonPlan(topicData);

      // 3. Save to backend
      const response = await fetch('/api/save-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topicId: topic.id,
          lessonPlan: lessonPlan
        }),
      });

      if (!response.ok) throw new Error('Failed to save lesson plan');

      const data = await response.json();
      onGenerateLesson(data.data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate lesson plan. Please try again.');
    } finally {
      setGeneratingId(null);
    }
  };

  // Group by chapter
  const chapters = structure.reduce((acc: any, item: any) => {
    if (!acc[item.chapter_name]) acc[item.chapter_name] = [];
    acc[item.chapter_name].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-5xl mx-auto py-8 px-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase rounded-full">
                  {document.type}
                </span>
                <span className="text-gray-400 text-sm font-medium">
                  Uploaded on {new Date(document.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{document.name}</h1>
            </div>
            <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
              document.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {document.status === 'completed' ? 'Fully Processed' : 'Processing...'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-50">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chapters</span>
              <span className="text-xl font-bold text-gray-800">{Object.keys(chapters).length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Topics</span>
              <span className="text-xl font-bold text-gray-800">{structure.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
              <span className="text-xl font-bold text-gray-800">Ready</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Content Structure</h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-gray-500 font-medium">Analyzing document structure...</p>
            </div>
          ) : Object.keys(chapters).length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <FileText size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">No topics found</h3>
              <p className="text-gray-500">We couldn't extract a clear structure from this document.</p>
            </div>
          ) : (
            Object.entries(chapters).map(([chapter, topics]: [string, any]) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={chapter} 
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <ChevronRight size={16} className="text-blue-500" />
                    {chapter}
                  </h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {topics.map((topic: any) => (
                    <div key={topic.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-colors">
                      <div>
                        <p className="text-gray-700 font-medium">{topic.topic_name}</p>
                        {topic.unit_name && (
                          <p className="text-xs text-gray-400 font-medium mt-0.5">Unit: {topic.unit_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleGenerate(topic)}
                        disabled={generatingId !== null}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50"
                      >
                        {generatingId === topic.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Generate Plan
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
