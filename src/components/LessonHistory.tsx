import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, FileText, ChevronRight, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

interface LessonHistoryProps {
  onBack: () => void;
  onSelectPlan: (plan: any) => void;
}

export default function LessonHistory({ onBack, onSelectPlan }: LessonHistoryProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(plan => 
    (plan.lesson_topic || plan.topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (plan.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeletePlan = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this lesson plan?')) return;

    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPlans(plans.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert('Failed to delete plan');
    }
  };

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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Clock className="text-blue-600" />
              Lesson Plan History
            </h1>
            <p className="text-gray-500 mt-1">View and reuse your previously generated lesson plans.</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-500 font-medium">Loading history...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No plans found</h3>
            <p className="text-gray-500">You haven't generated any lesson plans yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlans.map((plan) => (
              <motion.div
                whileHover={{ y: -4 }}
                key={plan.id}
                onClick={() => onSelectPlan(plan)}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-full">
                    {plan.subject}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-[10px] font-medium">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={(e) => handleDeletePlan(e, plan.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {plan.lesson_topic || plan.topic}
                </h3>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-500 font-medium">Class: {plan.class || plan.class_level}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
