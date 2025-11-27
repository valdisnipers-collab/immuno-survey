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

  // Sync text input when step changes (for Back button functionality)
  useEffect(() => {
      const currentQ = questions[currentStep];
      if (currentQ) {
          const existingAnswer = responses.find(r => r.questionId === currentQ.id)?.answer;
          if (currentQ.type === 'text') {
              setTextInput((existingAnswer as string) || '');
          }
      }
  }, [currentStep, questions, responses]);

  const handleAnswer = (value: string | number) => {
    const currentQuestion = questions[currentStep];
    
    // Update responses
    setResponses((prev) => {
      // Remove existing answer for this question
      const existing = prev.filter(r => r.questionId !== currentQuestion.id);
      
      // Handle multiple choice toggle if needed (currently implementation implies single array replacement)
      // For type 'multiple', we might need different logic, but assuming simple selection for now:
      return [...existing, { questionId: currentQuestion.id, answer: value }];
    });

    // Auto-advance logic
    // Only auto-advance for single choice and scale if it's not the last question
    if (
        currentQuestion.type !== 'multiple' && 
        currentQuestion.type !== 'text' && 
        currentStep < questions.length - 1
    ) {
      // Small delay for visual feedback
      setTimeout(() => {
          setCurrentStep(c => c + 1);
      }, 250);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTextInput(val);
    
    // Debounce or direct update? Direct update is safer for "Next" button state
    setResponses((prev) => {
        const existing = prev.filter(r => r.questionId !== questions[currentStep].id);
        return [...existing, { questionId: questions[currentStep].id, answer: val }];
    });
  };

  const isCurrentAnswered = () => {
    const qId = questions[currentStep]?.id;
    if (!qId) return false;

    // For text, check local state or response
    if (questions[currentStep].type === 'text') {
        // Text is optional? If mandatory, check textInput.trim().length > 0
        return true; 
    }

    return responses.some(r => r.questionId === qId);
  };

  const getResponseValue = (qId: string) => {
    return responses.find(r => r.questionId === qId)?.answer;
  };

  const submitSurvey = async () => {
    setLoading(true);
    const fingerprint = generateFingerprint();
    
    // Ensure data integrity: filter out any empty text responses if necessary
    const cleanResponses = responses.filter(r => r.answer !== null && r.answer !== '');

    const payload = {
      device_id: fingerprint,
      answers: cleanResponses,
      created_at: new Date().toISOString()
    };

    console.log("Submitting Payload:", payload);

    if (isSupabaseConfigured() && supabase) {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('responses')
        .select('id')
        .eq('device_id', fingerprint)
        .single();
      
      if (existing) {
        alert("Šī ierīce jau ir iesniegusi aptauju! Paldies par dalību.");
        setLoading(false);
        onComplete(); // Still allow them to see success screen
        return;
      }

      const { error } = await supabase.from('responses').insert([payload]);
      if (error) {
        console.error("Submission DB Error:", error);
        alert("Kļūda saglabājot datus. Lūdzu pārbaudiet interneta savienojumu.");
        setLoading(false);
        return;
      }
    } else {
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    localStorage.setItem('hasVoted', 'true');
    setLoading(false);
    onComplete();
  };

  // --- RENDER HELPERS ---

  const renderOptions = (q: Question) => {
    return (
      <div className="space-y-2 w-full">
        {q.options?.map((opt) => {
          const isSelected = getResponseValue(q.id) === opt.value;
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(opt.value)}
              className={clsx(
                "w-full px-4 py-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group",
                isSelected 
                  ? "border-science-500 bg-science-50 dark:bg-science-900/40 text-science-700 dark:text-science-300 shadow-sm ring-1 ring-science-500" 
                  : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-science-300 dark:hover:border-science-600"
              )}
            >
              <span className="font-medium text-base md:text-lg leading-tight">{opt.text}</span>
              <div className={clsx(
                  "w-5 h-5 rounded-full border flex items-center justify-center ml-2",
                  isSelected ? "border-science-500 bg-science-500 text-white" : "border-gray-300 dark:border-slate-500"
              )}>
                  {isSelected && <Check size={12} strokeWidth={4} />}
              </div>
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
      <div className="w-full mt-2">
        <div className="flex justify-between text-xs md:text-sm text-gray-500 mb-3 font-medium px-1">
          <span>{q.minLabel}</span>
          <span>{q.maxLabel}</span>
        </div>
        <div className="grid grid-cols-5 gap-2 md:flex md:justify-center md:gap-3">
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((val) => (
            <motion.button
              key={val}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAnswer(val)}
              className={clsx(
                "aspect-square rounded-lg flex items-center justify-center font-bold transition-all shadow-sm text-lg md:w-12 md:h-12",
                currentVal === val
                  ? "bg-science-600 text-white shadow-science-500/30 scale-105"
                  : "bg-white border border-gray-200 dark:bg-slate-700 dark:border-slate-600 text-gray-700 dark:text-gray-200"
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
          <div className="w-full h-full flex flex-col">
              <textarea 
                className="w-full flex-1 p-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-science-500 outline-none resize-none min-h-[150px] text-base"
                placeholder="Raksti savu atbildi šeit..."
                value={textInput}
                onChange={handleTextChange}
              />
          </div>
      )
  }

  // --- COMPACT LAYOUT (One Screen Design) ---
  
  if (questions.length === 0) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-science-600"></div></div>;

  const q = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-darkbg text-gray-900 dark:text-gray-100 overflow-hidden">
      
      {/* 1. Header (Fixed) - Minimalist */}
      <div className="shrink-0 bg-white dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 z-10">
          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800">
            <motion.div 
                className="h-full bg-science-500 rounded-r-full" 
                initial={{ width: 0 }} 
                animate={{ width: `${progress}%` }} 
                transition={{ duration: 0.4 }}
            />
          </div>
          <div className="px-4 py-3 flex justify-between items-center max-w-2xl mx-auto">
              <span className="text-xs font-bold text-science-600 dark:text-science-400 bg-science-50 dark:bg-science-900/50 px-2 py-1 rounded-md">
                 Jautājums {currentStep + 1} / {questions.length}
              </span>
              <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                 {deviceType === DeviceType.DESKTOP ? <Laptop size={12}/> : <Smartphone size={12}/>}
              </div>
          </div>
      </div>

      {/* 2. Main Content (Flexible, Scrollable inside if needed) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 w-full max-w-lg mx-auto flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="py-2"
            >
              {/* Question Text - Compact but readable */}
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-left leading-snug text-gray-800 dark:text-white">
                  {q.text}
              </h2>
              
              {/* Options Area */}
              <div className="w-full">
                 {q.type === 'scale' ? renderScale(q) : q.type === 'text' ? renderText(q) : renderOptions(q)}
              </div>
            </motion.div>
          </AnimatePresence>
      </div>

      {/* 3. Footer Navigation (Fixed Bottom) */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-4 pb-6 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 disabled:opacity-20 active:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          {currentStep === questions.length - 1 ? (
             <button
             onClick={submitSurvey}
             disabled={loading}
             className="flex-1 h-12 bg-science-600 text-white rounded-full font-bold shadow-lg shadow-science-600/20 disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-2 hover:bg-science-700 active:scale-[0.98] transition-all"
           >
             {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <>Iesniegt <Check size={20} /></>}
           </button>
          ) : (
            <button
            onClick={() => {
                // Clear input only if moving to a fresh text question? 
                // No, state management handles this via useEffect
                setCurrentStep(prev => Math.min(questions.length - 1, prev + 1))
            }}
            disabled={!isCurrentAnswered()}
            className="flex-1 h-12 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-full font-bold shadow-md disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            Tālāk <ArrowRight size={20} />
          </button>
          )}
        </div>
      </div>
    </div>
  );
};