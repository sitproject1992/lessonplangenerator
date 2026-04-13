import React, { useState } from 'react';
import { ArrowLeft, Download, Share2, Edit3, CheckCircle, List, Target, BookOpen, PenTool, ClipboardCheck, MessageSquare, Copy, Check, Languages, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateLessonPlan } from '../services/gemini';
import { supabase } from '../lib/supabase';

interface LessonPlanViewProps {
  plan: any;
  onBack: () => void;
}

export default function LessonPlanView({ plan: initialPlan, onBack }: LessonPlanViewProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(initialPlan);
  const [isSaving, setIsSaving] = useState(false);

  const handleTranslate = async (targetLang: string) => {
    if (isTranslating) return;
    setIsTranslating(true);
    try {
      // 1. Fetch full topic details to get context (curriculum, guide, etc.)
      const topicResponse = await fetch(`/api/topic/${plan.content_structure_id}`);
      if (!topicResponse.ok) throw new Error('Failed to fetch topic context');
      const topicData = await topicResponse.json();
      
      // 2. Add target language to topic data
      topicData.language = targetLang;

      // 3. Generate new plan in target language
      // Note: We're using the simplified call here, but since topicData now has documents info,
      // we could potentially fetch other docs if needed. For now, this is much better than before.
      const newPlanData = await generateLessonPlan(topicData);

      // 4. Save/Update in backend
      const response = await fetch('/api/save-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topicId: plan.content_structure_id,
          lessonPlan: newPlanData
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save translated plan to database, but showing it locally.');
        setPlan({ ...newPlanData, content_structure_id: plan.content_structure_id });
      } else {
        const result = await response.json();
        setPlan(result.data);
      }
    } catch (err) {
      console.error('Translation error:', err);
      alert('Failed to translate lesson plan. Please check your connection and try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    const text = `
Daily Lesson Plan

Subject: ${plan.subject}
Class: ${plan.class || plan.class_level}
Unit: ${plan.unit}
Period: ${plan.period || ''}
Lesson Topic: ${plan.lesson_topic || plan.topic}
Date: ${new Date().toLocaleDateString()}

1. Learning Outcomes:
${plan.learning_outcomes.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

2. Warm up & Review:
${plan.warmup_review}

3. Teaching Learning Activities:
a. ${(plan.teaching_learning_activities || plan.teaching_activities).a}
b. ${(plan.teaching_learning_activities || plan.teaching_activities).b}
c. ${(plan.teaching_learning_activities || plan.teaching_activities).c}
d. ${(plan.teaching_learning_activities || plan.teaching_activities).d}

4. Class Review / Evaluation:
a. ${plan.evaluation.a}
b. ${plan.evaluation.b}
c. ${plan.evaluation.c}
d. ${plan.evaluation.d}

5. Assignments:
Class Work: ${plan.assignments?.classwork || plan.assignments_classwork || plan.assignments}
Home Assignment: ${plan.assignments?.homework || plan.assignments_homework || ''}

Remarks:
${plan.remarks}
    `;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lesson Plan: ${plan.lesson_topic || plan.topic}`,
          text: `Check out this lesson plan for ${plan.subject} - ${plan.lesson_topic || plan.topic}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
      alert('Share not supported on this browser. Link copied to clipboard!');
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/save-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topicId: plan.content_structure_id,
          lessonPlan: {
            ...editForm,
            // Ensure assignments is in the format expected by the backend
            assignments: typeof editForm.assignments === 'string' 
              ? { classwork: editForm.assignments, homework: '' }
              : editForm.assignments
          }
        }),
      });

      if (!response.ok) throw new Error('Failed to save changes');
      
      const result = await response.json();
      setPlan(result.data);
      setIsEditing(false);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Topics
          </button>
          <div className="flex gap-3">
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 mr-2">
              {['English', 'Nepali'].map((lang) => (
                <button
                  key={lang}
                  disabled={isTranslating}
                  onClick={() => handleTranslate(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    (plan.language || 'English') === lang 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {isTranslating && (plan.language || 'English') !== lang ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Languages size={12} />
                  )}
                  {lang}
                </button>
              ))}
            </div>
            <button 
              onClick={handleCopy}
              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button 
              onClick={handleShare}
              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
            >
              <Share2 size={18} />
            </button>
            <button className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
              <Download size={18} />
            </button>
            <button 
              onClick={() => {
                setEditForm(plan);
                setIsEditing(true);
              }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Edit3 size={18} />
              Edit Plan
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-900">Edit Lesson Plan</h2>
                  <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                    <ArrowLeft size={24} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                      <input 
                        type="text" 
                        value={editForm.subject} 
                        onChange={e => setEditForm({...editForm, subject: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
                      <input 
                        type="text" 
                        value={editForm.class || editForm.class_level} 
                        onChange={e => setEditForm({...editForm, class: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Topic</label>
                    <input 
                      type="text" 
                      value={editForm.lesson_topic || editForm.topic} 
                      onChange={e => setEditForm({...editForm, lesson_topic: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Learning Outcomes (One per line)</label>
                    <textarea 
                      rows={4}
                      value={editForm.learning_outcomes.join('\n')} 
                      onChange={e => setEditForm({...editForm, learning_outcomes: e.target.value.split('\n')})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Warm up & Review</label>
                    <textarea 
                      rows={3}
                      value={editForm.warmup_review} 
                      onChange={e => setEditForm({...editForm, warmup_review: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 border-b pb-2">Activities</h3>
                      {['a', 'b', 'c', 'd'].map(key => (
                        <div key={key}>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Activity {key}</label>
                          <textarea 
                            rows={2}
                            value={(editForm.teaching_learning_activities || editForm.teaching_activities)[key]} 
                            onChange={e => {
                              const activities = { ...(editForm.teaching_learning_activities || editForm.teaching_activities), [key]: e.target.value };
                              setEditForm({...editForm, teaching_learning_activities: activities});
                            }}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 border-b pb-2">Evaluation</h3>
                      {['a', 'b', 'c', 'd'].map(key => (
                        <div key={key}>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evaluation {key}</label>
                          <textarea 
                            rows={2}
                            value={editForm.evaluation[key]} 
                            onChange={e => {
                              const evaluation = { ...editForm.evaluation, [key]: e.target.value };
                              setEditForm({...editForm, evaluation});
                            }}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden"
        >
          {/* Header Section - Grid Format */}
          <div className="p-10 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-center mb-8 uppercase tracking-widest text-gray-800">Daily Lesson Plan</h1>
            
            <div className="grid grid-cols-2 border-2 border-gray-900 rounded-xl overflow-hidden">
              <div className="p-4 border-r-2 border-b-2 border-gray-900">
                <span className="text-sm font-bold text-gray-900 mr-2">Subject:</span>
                <span className="text-sm text-gray-700 underline decoration-dotted underline-offset-4">{plan.subject}</span>
              </div>
              <div className="p-4 border-b-2 border-gray-900">
                <span className="text-sm font-bold text-gray-900 mr-2">Class:</span>
                <span className="text-sm text-gray-700 underline decoration-dotted underline-offset-4">{plan.class || plan.class_level}</span>
              </div>
              <div className="p-4 border-r-2 border-b-2 border-gray-900">
                <span className="text-sm font-bold text-gray-900 mr-2">Unit:</span>
                <span className="text-sm text-gray-700 underline decoration-dotted underline-offset-4">{plan.unit}</span>
              </div>
              <div className="p-4 border-b-2 border-gray-900">
                <span className="text-sm font-bold text-gray-900 mr-2">Period:</span>
                <span className="text-sm text-gray-700 underline decoration-dotted underline-offset-4">{plan.period || '1st'}</span>
              </div>
              <div className="p-4 border-r-2 border-gray-900">
                <span className="text-sm font-bold text-gray-900 mr-2">Lesson Topic:</span>
                <span className="text-sm text-gray-700 underline decoration-dotted underline-offset-4">{plan.lesson_topic || plan.topic}</span>
              </div>
              <div className="p-4">
                <span className="text-sm font-bold text-gray-900 mr-2">Date:</span>
                <span className="text-sm text-gray-700 underline decoration-dotted underline-offset-4">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-10">
            {/* 1. Learning Outcomes */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">1. Learning Outcomes:</h2>
              <div className="space-y-2 pl-4">
                {plan.learning_outcomes.map((outcome: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-bold text-gray-900">{i + 1}.</span>
                    <p className="text-gray-700 underline decoration-dotted underline-offset-4 w-full">{outcome}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Warm up & Review */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">2. Warm up & Review:</h2>
              <div className="pl-4">
                <p className="text-gray-700 underline decoration-dotted underline-offset-4 leading-loose">{plan.warmup_review}</p>
              </div>
            </section>

            {/* 3. Teaching Learning Activities */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">3. Teaching Learning Activities</h2>
              <div className="space-y-3 pl-4">
                {['a', 'b', 'c', 'd'].map((key) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-bold text-gray-900">{key}.</span>
                    <p className="text-gray-700 underline decoration-dotted underline-offset-4 w-full">{(plan.teaching_learning_activities || plan.teaching_activities)[key]}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Class Review / Evaluation */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">4. Class Review / Evaluation</h2>
              <div className="space-y-3 pl-4">
                {['a', 'b', 'c', 'd'].map((key) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-bold text-gray-900">{key}.</span>
                    <p className="text-gray-700 underline decoration-dotted underline-offset-4 w-full">{plan.evaluation[key]}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. Assignments */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">5. Assignments</h2>
              <div className="grid grid-cols-2 border-2 border-gray-900 rounded-xl overflow-hidden">
                <div className="border-r-2 border-gray-900">
                  <div className="bg-gray-50 p-2 text-center font-bold border-b-2 border-gray-900 text-sm">Class Work</div>
                  <div className="p-4 min-h-[100px]">
                    <p className="text-gray-700 text-sm underline decoration-dotted underline-offset-4 leading-relaxed">
                      {typeof plan.assignments === 'object' ? plan.assignments?.classwork : plan.assignments}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="bg-gray-50 p-2 text-center font-bold border-b-2 border-gray-900 text-sm">Home Assignment</div>
                  <div className="p-4 min-h-[100px]">
                    <p className="text-gray-700 text-sm underline decoration-dotted underline-offset-4 leading-relaxed">
                      {typeof plan.assignments === 'object' ? plan.assignments?.homework : ''}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Remarks */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Remarks:</h2>
              <div className="pl-4">
                <p className="text-gray-700 underline decoration-dotted underline-offset-4 leading-loose">{plan.remarks}</p>
              </div>
            </section>

            {/* Signatures */}
            <div className="flex justify-between pt-16 pb-8">
              <div className="text-center">
                <div className="w-48 border-t-2 border-gray-900 mb-2"></div>
                <span className="text-sm font-bold text-gray-900">Subject Teacher's Signature</span>
              </div>
              <div className="text-center">
                <div className="w-48 border-t-2 border-gray-900 mb-2"></div>
                <span className="text-sm font-bold text-gray-900">Principal's Signature</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
