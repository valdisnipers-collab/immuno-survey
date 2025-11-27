import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
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
          // Map DB structure to frontend structure if necessary, assuming 1:1 for now
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

    // Auto-advance for single choice on mobile
    if (deviceType === DeviceType.MOBILE && currentQuestion.type !== 'multiple' && currentQuestion.type !== 'text') {
      setTimeout(() => {
        if (currentStep < questions.length - 1) {
          setCurrentStep(c => c + 1);
        }
      }, 250);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    handleAnswer(e.target.value);
  };

  const isCurrentAnswered = () => {
    const qId = questions[currentStep].id;
    const hasResponse = responses.some(r => r.questionId === qId);
    
    // For text inputs, check if input is not just whitespace if it were mandatory
    // Assuming text questions are optional or handled via state
    if (questions[currentStep].type === 'text') {
        return true; // Let's make text optional for UX flow
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
      // Check if device already exists
      const { data: existing } = await supabase
        .from('responses')
        .select('id')
        .eq('device_id', fingerprint)
        .single();
      
      if (existing) {
        alert("Šī ierīce jau ir iesniegusi aptauju!");
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
      // Mock submission simulation
      console.log("MOCK SUBMISSION:", payload);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    localStorage.setItem('hasVoted', 'true');
    setLoading(false);
    onComplete();
  };

  // --- RENDER HELPERS ---

  const renderOptions = (q: Question) => {
    return (
      <div className="space-y-3 w-full max-w-md mx-auto">
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
                  ? "border-science-500 bg-science-50 dark:bg-science-900/30 text-science-700 dark:text-science-300" 
                  : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-science-300 dark:hover:border-science-700"
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
      <div className="w-full max-w-lg mx-auto mt-6">
        <div className="flex justify-between text-sm text-gray-500 mb-4 font-medium">
          <span>{q.minLabel}</span>
          <span>{q.maxLabel}</span>
        </div>
        <div className="flex justify-between gap-1 flex-wrap md:flex-nowrap">
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((val) => (
            <motion.button
              key={val}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAnswer(val)}
              className={clsx(
                "w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-bold transition-colors m-1",
                currentVal === val
                  ? "bg-science-500 text-white shadow-lg shadow-science-500/30"
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
          <div className="w-full max-w-lg mx-auto">
              <textarea 
                className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-science-500 outline-none h-32"
                placeholder="Raksti savu atbildi šeit..."
                value={textInput || (getResponseValue(q.id) as string) || ''}
                onChange={handleTextChange}
              />
          </div>
      )
  }

  // --- MOBILE VIEW (One Question Per Screen) ---
  if (deviceType === DeviceType.MOBILE) {
    const q = questions[currentStep];
    const progress = ((currentStep + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-darkbg text-gray-900 dark:text-gray-100 transition-colors">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 dark:bg-slate-800 w-full fixed top-0 left-0 z-50">
          <motion.div 
            className="h-full bg-science-500" 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
          />
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 max-w-2xl mx-auto w-full relative">
          <div className="mb-4 text-center text-sm font-bold text-science-600 dark:text-science-400">
            Jautājums {currentStep + 1} no {questions.length}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h2 className="text-2xl font-bold mb-8 text-center leading-tight">{q.text}</h2>
              
              {q.type === 'scale' ? renderScale(q) : q.type === 'text' ? renderText(q) : renderOptions(q)}

            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 flex justify-between items-center bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="p-3 rounded-full text-gray-400 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft />
          </button>
          
          {currentStep === questions.length - 1 ? (
             <button
             onClick={submitSurvey}
             disabled={loading}
             className="px-8 py-3 bg-science-600 text-white rounded-full font-bold shadow-lg shadow-science-600/30 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
           >
             {loading ? 'Sūta...' : 'Pabeigt'} <Check size={20} />
           </button>
          ) : (
            <button
            onClick={() => {
                setTextInput(''); // Clear text input for next Q if needed
                setCurrentStep(prev => Math.min(questions.length - 1, prev + 1))
            }}
            disabled={!isCurrentAnswered()}
            className="px-6 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-full font-semibold disabled:opacity-50 transition flex items-center gap-2"
          >
            Tālāk <ArrowRight size={18} />
          </button>
          )}
        </div>
      </div>
    );
  }

  // --- DESKTOP VIEW (Card List) ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkbg py-12 px-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Aptaujas jautājumi</h1>
          <p className="text-gray-500 dark:text-gray-400">Lūdzu atbildiet godīgi uz visiem jautājumiem.</p>
        </header>

        {questions.map((q, idx) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700"
          >
            <div className="flex items-start gap-4 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-science-100 dark:bg-science-900 text-science-700 dark:text-science-300 font-bold text-sm shrink-0">
                {idx + 1}
              </span>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{q.text}</h3>
            </div>
            
            <div onClick={() => setCurrentStep(idx)}> 
              {q.type === 'scale' ? renderScale(q) : q.type === 'text' ? renderText(q) : renderOptions(q)}
            </div>
          </motion.div>
        ))}

        <div className="flex justify-end pt-8 pb-20">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={submitSurvey}
            disabled={responses.length < questions.length && questions.every(q => q.type !== 'text') || loading} // Simple validation
            className="px-10 py-4 bg-science-600 hover:bg-science-700 text-white text-lg rounded-xl font-bold shadow-xl shadow-science-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3"
          >
             {loading ? 'Apstrādā...' : 'Iesniegt atbildes'} <Check />
          </motion.button>
        </div>
      </div>
    </div>
  );
};