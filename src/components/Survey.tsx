import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronLeft, Laptop, Smartphone } from 'lucide-react';
import { Question, SurveyResponse, DeviceType } from '../types';
import { DEFAULT_QUESTIONS, generateFingerprint } from '../utils/data';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import clsx from 'clsx';

interface SurveyProps {
  deviceType: DeviceType;
  onComplete: () => void;
}

export const Survey: React.FC<SurveyProps> = ({ deviceType, onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Fetch questions from Supabase if configured, else use Mock
  useEffect(() => {
    const fetchQuestions = async () => {
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.from('questions').select('*').order('order', { ascending: true });
        if (!error && data && data.length > 0) {
          setQuestions(data as unknown as Question[]);
        }
      }
    };
    fetchQuestions();
  }, []);

  const handleAnswer = (value: string | number) => {
    const currentQuestion = questions[currentStep];
    
    // Update responses
    setResponses((prev) => {
      const existing = prev.filter(r => r.questionId !== currentQuestion.id);
      return [...existing, { questionId: currentQuestion.id, answer: value }];
    });

    // Auto-advance for single choice (works on both mobile and desktop now)
    if (currentQuestion.type !== 'multiple' && currentQuestion.type !== 'text') {
      setTimeout(() => {
        if (currentStep < questions.length - 1) {
          setCurrentStep(c => c + 1);
        }
      }, 300);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    handleAnswer(e.target.value);
  };

  const isCurrentAnswered = () => {
    const qId = questions[currentStep].id;
    const hasResponse = responses.some(r => r.questionId === qId);
    
    if (questions[currentStep].type === 'text') {
        return true; // Text fields are optional regarding navigation logic
    }
    return hasResponse;
  };

  const getResponseValue = (qId: string) => {
    return responses.find(r => r.questionId === qId)?.answer;
  };

  const submitSurvey = async () => {
    setLoading(true);
    const fingerprint = generateFingerprint();
    const payload = {
      device_id: fingerprint,
      answers: responses,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      // Check if device already exists (Production Mode Enabled)
      const { data: existing } = await supabase
        .from('responses')
        .select('id')
        .eq('device_id', fingerprint)
        .single();
      
      if (existing) {
        alert("Šī ierīce jau ir iesniegusi aptauju! Paldies par dalību.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('responses').insert([payload]);
      if (error) {
        console.error("Submission failed", error);
        alert("Kļūda saglabājot datus. Lūdzu mēģiniet vēlreiz.");
        setLoading(false);
        return;
      }
    } else {
      console.log("MOCK SUBMISSION:", payload);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    localStorage.setItem('hasVoted', 'true');
    setLoading(false);
    onComplete();
  };

  // --- RENDER HELPERS ---

  const renderOptions = (q: Question) => {
    return (
      <div className="space-y-3 w-full">
        {q.options?.map((opt) => {
          const isSelected = getResponseValue(q.id) === opt.value;
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(opt.value)}
              className={clsx(
                "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group",
                isSelected 
                  ? "border-science-500 bg-science-50 dark:bg-science-900/30 text-science-700 dark:text-science-300 shadow-md" 
                  : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-science-300 dark:hover:border-science-700 hover:shadow-sm"
              )}
            >
              <span className="font-medium text-lg">{opt.text}</span>
              {isSelected && <Check className="w-5 h-5 text-science-500" />}
            </motion.button>
          );
        })}
      </div>
    );
  };

  const renderScale = (q: Question) => {
    const min = q.min || 1;
    const max = q.max || 10;
    const currentVal = getResponseValue(q.id) as number;
    
    return (
      <div className="w-full mt-6">
        <div className="flex justify-between text-sm text-gray-500 mb-4 font-medium">
          <span>{q.minLabel}</span>
          <span>{q.maxLabel}</span>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((val) => (
            <motion.button
              key={val}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAnswer(val)}
              className={clsx(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold transition-colors shadow-sm",
                currentVal === val
                  ? "bg-science-500 text-white shadow-lg shadow-science-500/30 scale-110"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-science-100 dark:hover:bg-slate-600"
              )}
            >
              {val}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  const renderText = (q: Question) => {
      return (
          <div className="w-full">
              <textarea 
                className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-science-500 outline-none h-32 resize-none"
                placeholder="Raksti savu atbildi šeit..."
                value={textInput || (getResponseValue(q.id) as string) || ''}
                onChange={handleTextChange}
              />
          </div>
      )
  }

  // --- UNIFIED VIEW (Wizard / Step-by-Step for ALL devices) ---
  
  const q = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-darkbg text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* Top Bar with Progress */}
      <div className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
          <div className="h-1 w-full bg-gray-100 dark:bg-slate-800">
            <motion.div 
                className="h-full bg-science-500" 
                initial={{ width: 0 }} 
                animate={{ width: `${progress}%` }} 
                transition={{ duration: 0.5 }}
            />
          </div>
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="text-sm font-bold text-science-600 dark:text-science-400">
                 {currentStep + 1} / {questions.length}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                 {deviceType === DeviceType.DESKTOP ? <Laptop size={14}/> : <Smartphone size={14}/>}
                 <span>{deviceType === DeviceType.DESKTOP ? 'Datora skats' : 'Mobilais skats'}</span>
              </div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 mt-16 pb-24 w-full">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center leading-tight text-gray-800 dark:text-white">
                  {q.text}
              </h2>
              
              <div className="flex justify-center w-full">
                  <div className="w-full max-w-lg">
                    {q.type === 'scale' ? renderScale(q) : q.type === 'text' ? renderText(q) : renderOptions(q)}
                  </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-4 md:p-6 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="p-4 rounded-full text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800 transition group"
          >
            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
          </button>
          
          {currentStep === questions.length - 1 ? (
             <button
             onClick={submitSurvey}
             disabled={loading}
             className="px-8 py-4 bg-science-600 text-white rounded-full font-bold shadow-lg shadow-science-600/30 disabled:opacity-50 disabled:shadow-none flex items-center gap-3 hover:bg-science-700 transition-all active:scale-95"
           >
             {loading ? 'Sūta...' : 'Iesniegt anketu'} <Check size={20} />
           </button>
          ) : (
            <button
            onClick={() => {
                setTextInput(''); 
                setCurrentStep(prev => Math.min(questions.length - 1, prev + 1))
            }}
            disabled={!isCurrentAnswered()}
            className="px-8 py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-full font-bold disabled:opacity-50 transition-all flex items-center gap-3 hover:shadow-lg active:scale-95"
          >
            Tālāk <ArrowRight size={20} />
          </button>
          )}
        </div>
      </div>
    </div>
  );
};