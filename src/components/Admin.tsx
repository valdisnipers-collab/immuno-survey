import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { Download, Plus, Trash2, Edit2, LogIn, Database, LogOut, Save, X } from 'lucide-react';
import { Question } from '../types';
import { DEFAULT_QUESTIONS } from '../utils/data';

export const Admin: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');
  const [responsesCount, setResponsesCount] = useState(0);

  // New Question State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState('single');
  const [newQOptions, setNewQOptions] = useState(''); // Comma separated

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchData();
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchData();
        });

        return () => subscription.unsubscribe();
    } else {
        // Fallback for demo without auth
        setQuestions(DEFAULT_QUESTIONS);
    }
  }, []);

  const fetchData = async () => {
      if (!supabase) return;
      
      // Get count
      const { count } = await supabase.from('responses').select('*', { count: 'exact', head: true });
      if (count !== null) setResponsesCount(count);
      
      // Get questions
      const { data: qData, error } = await supabase.from('questions').select('*').order('order', { ascending: true });
      if (qData && qData.length > 0) {
          setQuestions(qData as unknown as Question[]);
      } else if (!error && (!qData || qData.length === 0)) {
          // If DB is empty, offer to seed? Or just show empty.
          // For now, keep state empty so user can add.
          setQuestions([]);
      }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured() || !supabase) {
        if (email === 'admin' && password === 'admin') {
            setSession({ user: { email: 'mock@admin.com'} });
        } else {
            alert("Demo Login: admin / admin");
        }
        return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  };

  // --- ACTIONS ---

  const deleteQuestion = async (id: string) => {
      if (!confirm("Vai tiešām dzēst šo jautājumu?")) return;
      
      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('questions').delete().eq('id', id);
          if (error) {
              alert("Kļūda dzēšot: " + error.message);
          } else {
              fetchData(); // Refresh
          }
      } else {
          // Demo mode
          setQuestions(prev => prev.filter(q => q.id !== id));
      }
  };

  const addQuestion = async () => {
      if (!newQText) return alert("Ievadi jautājuma tekstu");

      const newId = `q_${Date.now()}`;
      
      let optionsArray = undefined;
      if (newQType === 'single' || newQType === 'multiple') {
          optionsArray = newQOptions.split(',').map((opt, idx) => ({
              id: `opt_${idx}`,
              text: opt.trim(),
              value: opt.trim().toLowerCase().replace(/\s/g, '_')
          })).filter(o => o.text !== '');
      }

      const newQ: any = {
          id: newId,
          text: newQText,
          type: newQType,
          options: optionsArray,
          order: questions.length + 1
      };

      if (newQType === 'scale') {
          newQ.min = 1;
          newQ.max = 10;
          newQ.minLabel = 'Maz';
          newQ.maxLabel = 'Daudz';
      }

      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('questions').insert([newQ]);
          if (error) {
              alert("Kļūda pievienojot: " + error.message);
          } else {
              setShowAddModal(false);
              setNewQText('');
              setNewQOptions('');
              fetchData();
          }
      } else {
          setQuestions([...questions, newQ]);
          setShowAddModal(false);
      }
  };

  const downloadExcel = async () => {
    let dataToExport = [];
    
    if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.from('responses').select('*');
        if (error) {
            alert('Error fetching data');
            return;
        }
        dataToExport = data;
    } else {
        alert("Demo Mode: Exporting mock data.");
        dataToExport = [
            { id: 1, created_at: new Date(), device_id: 'abc', answers: [{questionId: 'demo_gender', answer: 'male'}] }
        ];
    }

    const flatData = dataToExport.map((row: any) => {
        const answerObj: any = { Date: row.created_at, DeviceID: row.device_id };
        if (Array.isArray(row.answers)) {
            row.answers.forEach((ans: any) => {
                answerObj[ans.questionId] = ans.answer;
            });
        }
        return answerObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, "ImmunoSurvey_Rezultati.xlsx");
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-darkbg">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">Admin Piekļuve</h2>
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-pasts</label>
                    <input 
                        type="text" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-science-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parole</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-science-500 outline-none"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3 bg-science-600 text-white rounded-lg font-bold hover:bg-science-700 transition flex justify-center items-center gap-2"
                >
                    <LogIn size={20} /> Ielogoties
                </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkbg text-gray-900 dark:text-gray-100">
        <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center gap-2 font-bold text-xl text-science-600">
                <Database /> Admin Panelis
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400 hidden sm:block">{session.user.email}</span>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                    <LogOut size={16} /> <span className="hidden sm:inline">Iziet</span>
                </button>
            </div>
        </nav>

        <main className="p-4 md:p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 mb-8">
                {/* Stats */}
                <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Kopā iesniegumi</h3>
                    <p className="text-4xl font-bold mt-2 text-gray-800 dark:text-white">{responsesCount}</p>
                </div>

                {/* Export */}
                <div className="flex-1 bg-gradient-to-r from-science-500 to-science-600 p-6 rounded-xl shadow-lg text-white flex items-center justify-between cursor-pointer hover:shadow-xl transition" onClick={downloadExcel}>
                    <div>
                        <h3 className="font-bold text-lg">Eksportēt Datus</h3>
                        <p className="text-science-100 text-sm">Lejupielādēt Excel (.xlsx)</p>
                    </div>
                    <div className="bg-white text-science-600 p-3 rounded-full">
                        <Download />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-slate-700 p-4 justify-between items-center">
                    <h3 className="font-bold text-lg">Jautājumu saraksts</h3>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg text-sm hover:opacity-90 font-medium"
                    >
                        <Plus size={16} /> Pievienot
                    </button>
                </div>

                <div className="p-0">
                    {questions.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            Nav jautājumu. Pievieno pirmo!
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {questions.map((q) => (
                                <div key={q.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-500">{q.type}</span>
                                        </div>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{q.text}</p>
                                        {q.options && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Opcijas: {q.options.map(o => o.text).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => deleteQuestion(q.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                        title="Dzēst"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>

        {/* Add Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Jauns jautājums</h3>
                        <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Jautājums</label>
                            <input 
                                className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                value={newQText}
                                onChange={e => setNewQText(e.target.value)}
                                placeholder="Ievadi jautājuma tekstu..."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Tips</label>
                            <select 
                                className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                value={newQType}
                                onChange={e => setNewQType(e.target.value)}
                            >
                                <option value="single">Viena izvēle (Radio)</option>
                                <option value="scale">Skala (1-10)</option>
                                <option value="text">Teksta ievade</option>
                            </select>
                        </div>

                        {newQType === 'single' && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Atbilžu varianti (atdalīti ar komatu)</label>
                                <input 
                                    className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                    value={newQOptions}
                                    onChange={e => setNewQOptions(e.target.value)}
                                    placeholder="Jā, Nē, Varbūt..."
                                />
                            </div>
                        )}

                        <button 
                            onClick={addQuestion}
                            className="w-full py-3 bg-science-600 text-white rounded-lg font-bold mt-4 hover:bg-science-700"
                        >
                            Saglabāt
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};