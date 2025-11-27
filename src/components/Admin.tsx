import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { Download, Plus, Trash2, Edit2, LogIn, Database, LogOut } from 'lucide-react';
import { Question } from '../types';
import { DEFAULT_QUESTIONS } from '../utils/data';

export const Admin: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');
  const [responsesCount, setResponsesCount] = useState(0);

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
    }
  }, []);

  const fetchData = async () => {
      if (!supabase) return;
      const { count } = await supabase.from('responses').select('*', { count: 'exact', head: true });
      if (count !== null) setResponsesCount(count);
      
      const { data: qData } = await supabase.from('questions').select('*').order('order', { ascending: true });
      if (qData && qData.length > 0) setQuestions(qData as unknown as Question[]);
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured() || !supabase) {
        // Mock login for demo
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
        alert("Demo Mode: No real database connected. Exporting mock data.");
        dataToExport = [
            { id: 1, created_at: new Date(), device_id: 'abc', answers: [{questionId: 'demo_gender', answer: 'male'}] }
        ];
    }

    // Flatten data for Excel
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-pasts (Demo: admin)</label>
                    <input 
                        type="text" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-science-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parole (Demo: admin)</label>
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
            {!isSupabaseConfigured() && (
                <p className="mt-4 text-xs text-red-500 text-center">Supabase keys missing via .env. Using Demo Mode.</p>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkbg text-gray-900 dark:text-gray-100">
        <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-xl text-science-600">
                <Database /> Admin Panelis
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                <LogOut size={16} /> Iziet
            </button>
        </nav>

        <main className="p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 mb-8">
                {/* Stats Card */}
                <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Kopā iesniegumi</h3>
                    <p className="text-4xl font-bold mt-2 text-gray-800 dark:text-white">{responsesCount > 0 ? responsesCount : '---'}</p>
                </div>

                <div className="flex-1 bg-gradient-to-r from-science-500 to-science-600 p-6 rounded-xl shadow-lg text-white flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">Eksportēt Datus</h3>
                        <p className="text-science-100 text-sm">Lejupielādēt Excel (.xlsx)</p>
                    </div>
                    <button 
                        onClick={downloadExcel}
                        className="bg-white text-science-600 p-3 rounded-full hover:bg-science-50 transition shadow-md"
                    >
                        <Download />
                    </button>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-slate-700">
                    <button 
                        className={`px-6 py-4 font-medium ${activeTab === 'questions' ? 'text-science-600 border-b-2 border-science-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('questions')}
                    >
                        Jautājumu redaktors
                    </button>
                    {/* Add more tabs if needed */}
                </div>

                <div className="p-6">
                    {activeTab === 'questions' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">Aktīvie jautājumi</h3>
                                <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg text-sm hover:opacity-90">
                                    <Plus size={16} /> Pievienot jaunu
                                </button>
                            </div>
                            
                            {questions.map((q) => (
                                <div key={q.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-400">{q.id}</span>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{q.text}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-400 mt-1 inline-block">
                                            {q.type.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 text-gray-400 hover:text-science-600 transition"><Edit2 size={18} /></button>
                                        <button className="p-2 text-gray-400 hover:text-red-500 transition"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                            <p className="text-center text-sm text-gray-400 mt-8 italic">
                                Piezīme: Lai rediģēšanas funkcijas strādātu pilnībā, nepieciešams savienot ar Supabase DB tabulu "questions".
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    </div>
  );
};