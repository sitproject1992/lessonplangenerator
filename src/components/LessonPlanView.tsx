import React from 'react';
import { ArrowLeft, Download, Share2, Edit3, CheckCircle, List, Target, BookOpen, PenTool, ClipboardCheck, MessageSquare, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface LessonPlanViewProps {
  plan: any;
  onBack: () => void;
}

export default function LessonPlanView({ plan, onBack }: LessonPlanViewProps) {
  const [copied, setCopied] = React.useState(false);

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
            <button 
              onClick={handleCopy}
              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
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
                    <p className="text-gray-700 text-sm underline decoration-dotted underline-offset-4 leading-relaxed">${plan.assignments?.classwork || plan.assignments_classwork || plan.assignments}</p>
                  </div>
                </div>
                <div>
                  <div className="bg-gray-50 p-2 text-center font-bold border-b-2 border-gray-900 text-sm">Home Assignment</div>
                  <div className="p-4 min-h-[100px]">
                    <p className="text-gray-700 text-sm underline decoration-dotted underline-offset-4 leading-relaxed">${plan.assignments?.homework || plan.assignments_homework || ''}</p>
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
