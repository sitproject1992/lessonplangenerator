import React, { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Sparkles, Loader2, ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { generateLessonPlan } from '../services/gemini';

interface GroupDetailsProps {
  group: any;
  onBack: () => void;
  onGenerateLesson: (plan: any) => void;
}

export default function GroupDetails({ group, onBack, onGenerateLesson }: GroupDetailsProps) {
  const [structure, setStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStructure();
  }, [group.book.id]);

  const fetchStructure = async () => {
    console.log('Fetching structure for book:', group.book.id);
    setLoading(true);
    try {
      // Try API first
      const response = await fetch(`/api/structure/${group.book.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${data?.length || 0} structure items via API`);
        setStructure(data || []);
        return;
      }

      // Fallback
      if (supabase) {
        const { data, error } = await supabase
          .from('content_structure')
          .select('*')
          .eq('document_id', group.book.id)
          .order('chapter_name', { ascending: true });

        if (error) throw error;
        setStructure(data || []);
      }
    } catch (err) {
      console.error('Error fetching structure:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (topic: any) => {
    // If plan already exists, just view it
    if (topic.lesson_plans && topic.lesson_plans.length > 0) {
      try {
        const response = await fetch(`/api/lesson-plan/${topic.lesson_plans[0].id}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            onGenerateLesson(data);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching existing plan:', err);
      }
    }

    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }
    setGeneratingId(topic.id);
    try {
      // Generate with Gemini using group context
      const lessonPlan = await generateLessonPlan(topic, group);

      // Save to backend
      const response = await fetch('/api/save-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topicId: topic.id,
          lessonPlan: lessonPlan
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to save lesson plan');
        } else {
          const text = await response.text();
          throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      onGenerateLesson(data.data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate lesson plan.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateAll = async () => {
    alert('Generating all lesson plans sequentially. This may take a while...');
    for (const topic of structure) {
      await handleGenerate(topic);
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
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase rounded-full">
                  Grouped Resources
                </span>
                <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full">
                  Grade {group.grade} • {group.subject}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Curriculum-Aligned Lesson Planning</h1>
              <p className="text-gray-500 mt-2">Generating plans using Book, Curriculum, Teacher Guide, and Spec Grid.</p>
            </div>
            <button 
              onClick={handleGenerateAll}
              disabled={loading || structure.length === 0 || generatingId !== null}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              <Sparkles size={20} />
              Generate All Lessons
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-50">
            {[
              { label: 'Book', exists: !!group.book },
              { label: 'Curriculum', exists: !!group.curriculum },
              { label: 'Teacher Guide', exists: !!group.guide },
              { label: 'Spec Grid', exists: !!group.grid }
            ].map((item, i) => (
              <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${item.exists ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                <span className="text-xs font-bold uppercase">{item.label}</span>
                {item.exists ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Available Lessons</h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-gray-500 font-medium">Loading lessons...</p>
            </div>
          ) : Object.keys(chapters).length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
              <FileText size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">No lessons found</h3>
              <p className="text-gray-500">We couldn't find any topics for this book. Try re-uploading the book PDF.</p>
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
                        ) : (topic.lesson_plans && topic.lesson_plans.length > 0) ? (
                          <>
                            <CheckCircle size={16} className="text-green-500" />
                            View Plan
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
