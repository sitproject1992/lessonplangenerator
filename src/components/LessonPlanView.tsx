import React from 'react';
import { ArrowLeft, Download, Share2, Edit3, CheckCircle, List, Target, BookOpen, PenTool, ClipboardCheck, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface LessonPlanViewProps {
  plan: any;
  onBack: () => void;
}

export default function LessonPlanView({ plan, onBack }: LessonPlanViewProps) {
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
            <button className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
              <Share2 size={18} />
            </button>
            <button className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
              <Download size={18} />
            </button>
            <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
              <Edit3 size={18} />
              Edit Plan
            </button>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden"
        >
          {/* Header Section */}
          <div className="bg-blue-600 p-10 text-white">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                Lesson Plan
              </span>
              <span className="text-white/60 text-sm font-medium">• {plan.subject}</span>
            </div>
            <h1 className="text-4xl font-bold mb-6 leading-tight">{plan.topic}</h1>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Class</span>
                <span className="font-semibold">{plan.class_level}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Unit</span>
                <span className="font-semibold">{plan.unit}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Period</span>
                <span className="font-semibold">{plan.period || '1st Period'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Status</span>
                <span className="font-semibold flex items-center gap-1">
                  <CheckCircle size={14} /> Draft
                </span>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-12">
            {/* Learning Outcomes */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Target size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Learning Outcomes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plan.learning_outcomes.map((outcome: string, i: number) => (
                  <div key={i} className="flex gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <p className="text-gray-700 text-sm leading-relaxed">{outcome}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Warmup & Review */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Warmup & Review</h2>
              </div>
              <div className="p-6 bg-orange-50/30 rounded-2xl border border-orange-100">
                <p className="text-gray-700 leading-relaxed">{plan.warmup_review}</p>
              </div>
            </section>

            {/* Teaching Activities */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <PenTool size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Teaching Activities</h2>
              </div>
              <div className="space-y-4">
                {Object.entries(plan.teaching_activities).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold uppercase text-sm">
                      {key}
                    </span>
                    <p className="text-gray-700 leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Evaluation */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <ClipboardCheck size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Evaluation</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(plan.evaluation).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex gap-3 p-4 bg-green-50/30 rounded-2xl border border-green-100">
                    <span className="font-bold text-green-600 uppercase text-sm">{key}.</span>
                    <p className="text-gray-700 text-sm leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Assignments & Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <List size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900">Assignments</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                  {plan.assignments}
                </p>
              </section>
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                    <MessageSquare size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900">Remarks</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {plan.remarks}
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
