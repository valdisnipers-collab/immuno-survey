import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { Download, Plus, Trash2, Edit2, LogIn, Database, LogOut, X, Save, AlertCircle } from 'lucide-react';
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

  // --- Modal & Form State ---
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Ja ir ID, tad rediģējam, ja null - veidojam jaunu
  
  // Form Fields
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('single');
  const [qOptions, setQOptions] = useState(''); // String separated by comma
  const [qMinLabel, setQMinLabel] = useState('Maz');
  const [qMaxLabel, setQMaxLabel] = useState('Daudz');

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

  // --- ACTIONS: OPEN MODAL ---

  const openAddModal = () => {
      setEditingId(null);
      setQText('');
      setQType('single');
      setQOptions('');
      setQMinLabel('Maz');
      setQMaxLabel('Daudz');
      setShowModal(true);
  };

  const openEditModal = (q: Question) => {
      setEditingId(q.id);
      setQText(q.text);
      setQType(q.type);
      
      // Parse options back to string
      if (q.options && Array.isArray(q.options)) {
          setQOptions(q.options.map(o => o.text).join(', '));
      } else {
          setQOptions('');
      }

      setQMinLabel(q.minLabel || 'Maz');
      setQMaxLabel(q.maxLabel || 'Daudz');
      
      setShowModal(true);
  };

  // --- ACTIONS: SAVE / DELETE ---

  const deleteQuestion = async (id: string) => {
      if (!confirm("Vai tiešām dzēst šo jautājumu? Visa saistītā informācija tiks zaudēta.")) return;
      
      if (isSupabaseConfigured() && supabase) {
          const { error } = await supabase.from('questions').delete().eq('id', id);
          if (error) {
              alert("Kļūda dzēšot: " + error.message);
          } else {
              fetchData();
          }
      } else {
          setQuestions(prev => prev.filter(q => q.id !== id));
      }
  };

  const handleSaveQuestion = async () => {
      if (!qText.trim()) return alert("Lūdzu ievadiet jautājuma tekstu.");

      let optionsArray = null;
      // Convert options string to JSON array for single/multiple choice
      if (qType === 'single' || qType === 'multiple') {
          if (!qOptions.trim()) return alert("Lūdzu ievadiet atbilžu variantus.");
          optionsArray = qOptions.split(',').map((opt, idx) => ({
              id: `opt_${Date.now()}_${idx}`, // Unique ID for option
              text: opt.trim(),
              value: opt.trim() // Use text as value for simplicity in analysis
          })).filter(o => o.text !== '');
      }

      // Base payload
      const payload: any = {
          text: qText,
          type: qType,
          options: optionsArray,
          // If scale, add labels
          min: qType === 'scale' ? 1 : null,
          max: qType === 'scale' ? 10 : null,
          minLabel: qType === 'scale' ? qMinLabel : null,
          maxLabel: qType === 'scale' ? qMaxLabel : null,
      };

      if (isSupabaseConfigured() && supabase) {
          if (editingId) {
              // UPDATE Existing
              const { error } = await supabase
                  .from('questions')
                  .update(payload)
                  .eq('id', editingId);

              if (error) alert("Kļūda atjaunojot: " + error.message);
          } else {
              // INSERT New
              // Need ID and Order
              payload.id = `q_${Date.now()}`; 
              // Find max order
              const maxOrder = questions.length > 0 ? Math.max(...questions.map(q => (q as any).order || 0)) : 0;
              payload.order = maxOrder + 1;

              const { error } = await supabase
                  .from('questions')
                  .insert([payload]);

              if (error) alert("Kļūda saglabājot: " + error.message);
          }
          
          setShowModal(false);
          fetchData();

      } else {
          // Demo Update logic
          if (editingId) {
              setQuestions(prev => prev.map(q => q.id === editingId ? { ...q, ...payload, id: editingId } : q));
          } else {
              payload.id = `q_${Date.now()}`;
              setQuestions(prev => [...prev, payload]);
          }
          setShowModal(false);
      }
  };

  const downloadExcel = async () => {
    let dataToExport = [];
    
    if (isSupabaseConfigured() && supabase) {
        setLoading(true);
        const { data, error } = await supabase.from('responses').select('*').order('created_at', { ascending: false });
        setLoading(false);
        
        if (error) {
            alert('Kļūda lejupielādējot datus: ' + error.message);
            return;
        }
        dataToExport = data;
    } else {
        alert("Demo Mode: Exporting mock data.");
        dataToExport = [
            { id: 1, created_at: new Date().toISOString(), device_id: 'abc', answers: [{questionId: 'demo_gender', answer: 'male'}] }
        ];
    }

    if (dataToExport.length === 0) {
        alert("Nav datu ko eksportēt.");
        return;
    }

    // Transform Data: Flatten JSON responses
    const flatData = dataToExport.map((row: any) => {
        // Base row data
        const rowData: any = { 
            Datums: new Date(row.created_at).toLocaleString('lv-LV'), 
            Ierīces_ID: row.device_id 
        };

        // Map answers dynamically
        if (Array.isArray(row.answers)) {
            row.answers.forEach((ans: any) => {
                // Try to find the question text for better header, otherwise use ID
                const questionDef = questions.find(q => q.id === ans.questionId);
                const header = questionDef ? questionDef.text : ans.questionId;
                
                rowData[header] = ans.answer;
            });
        }
        return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    
    // Auto-adjust column widths (basic)
    const colWidths = Object.keys(flatData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15) // Min width 15 chars
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rezultāti");
    XLSX.writeFile(workbook, `ImmunoSurvey_Dati_${new Date().toISOString().slice(0,10)}.xlsx`);
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
    <div className="min-h-screen bg-gray-50 dark:bg-darkbg text-gray-900 dark:text-gray-100 pb-20">
        <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-xl text-science-600">
                <Database className="text-science-500"/> Admin Panelis
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs md:text-sm text-gray-400 hidden sm:block">{session.user.email}</span>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <LogOut size={18} /> <span className="hidden sm:inline">Iziet</span>
                </button>
            </div>
        </nav>

        <main className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Dashboard Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Kopā iesniegumi</h3>
                    <p className="text-5xl font-bold mt-2 text-science-600 dark:text-science-400">{responsesCount}</p>
                </div>

                <div 
                    onClick={downloadExcel}
                    className="bg-gradient-to-br from-science-500 to-science-700 p-6 rounded-2xl shadow-lg text-white flex items-center justify-between cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
                >
                    <div>
                        <h3 className="font-bold text-2xl mb-1">Eksportēt Datus</h3>
                        <p className="text-science-100 text-sm opacity-90 group-hover:opacity-100">Lejupielādēt rezultātus Excel (.xlsx) formātā</p>
                    </div>
                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition">
                        <Download size={32} />
                    </div>
                </div>
            </div>

            {/* Questions Management */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="flex flex-col sm:flex-row border-b border-gray-200 dark:border-slate-700 p-6 justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-xl text-gray-800 dark:text-white">Jautājumu saraksts</h3>
                        <p className="text-sm text-gray-500 mt-1">Šeit vari pievienot, labot un dzēst anketas jautājumus.</p>
                    </div>
                    <button 
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm hover:opacity-90 font-bold shadow-lg transition-transform active:scale-95"
                    >
                        <Plus size={18} /> Pievienot Jautājumu
                    </button>
                </div>

                <div className="p-0">
                    {questions.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                            <AlertCircle size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Saraksts ir tukšs</p>
                            <p className="text-sm">Pievieno pirmo jautājumu, lai sāktu.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 dark:hover:bg-slate-700/30 transition group">
                                    <div className="flex-1 pr-4 mb-4 sm:mb-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-science-100 dark:bg-science-900 text-science-700 dark:text-science-300 text-xs font-bold">
                                                {(q as any).order || idx + 1}
                                            </span>
                                            <span className="text-xs font-mono font-semibold bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-500 uppercase tracking-wide">
                                                {q.type === 'single' ? 'Viena izvēle' : q.type === 'multiple' ? 'Vairākas izvēles' : q.type === 'scale' ? 'Skala' : 'Teksts'}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-lg text-gray-800 dark:text-gray-200 leading-snug">{q.text}</p>
                                        
                                        {/* Preview options */}
                                        {(q.type === 'single' || q.type === 'multiple') && q.options && (
                                            <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                                                <span className="font-medium">Varianti:</span> {q.options.map(o => o.text).join(', ')}
                                            </p>
                                        )}
                                        {q.type === 'scale' && (
                                            <p className="text-sm text-gray-500 mt-2">
                                                Skala: {q.minLabel} (1) - {q.maxLabel} (10)
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button 
                                            onClick={() => openEditModal(q)}
                                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 hover:border-science-400 transition"
                                        >
                                            <Edit2 size={16} /> <span className="sm:hidden">Rediģēt</span>
                                        </button>
                                        <button 
                                            onClick={() => deleteQuestion(q.id)}
                                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                                        >
                                            <Trash2 size={16} /> <span className="sm:hidden">Dzēst</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>

        {/* --- ADD / EDIT MODAL --- */}
        {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            {editingId ? 'Rediģēt jautājumu' : 'Jauns jautājums'}
                        </h3>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-5 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Jautājuma teksts</label>
                            <input 
                                className="w-full p-3 border rounded-xl bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-science-500 outline-none transition"
                                value={qText}
                                onChange={e => setQText(e.target.value)}
                                placeholder="Piemēram: Cik bieži tu sporto?"
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Atbildes veids</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {val: 'single', label: 'Viena izvēle'},
                                    {val: 'multiple', label: 'Vairākas izvēles'},
                                    {val: 'scale', label: 'Skala (1-10)'},
                                    {val: 'text', label: 'Brīvs teksts'}
                                ].map((type) => (
                                    <button
                                        key={type.val}
                                        onClick={() => setQType(type.val)}
                                        className={`p-3 rounded-lg text-sm font-medium border-2 transition-all ${qType === type.val 
                                            ? 'border-science-500 bg-science-50 dark:bg-science-900/30 text-science-700 dark:text-science-300' 
                                            : 'border-gray-200 dark:border-slate-600 hover:border-science-300'}`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(qType === 'single' || qType === 'multiple') && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Atbilžu varianti <span className="text-gray-400 font-normal">(atdalīti ar komatu)</span>
                                </label>
                                <textarea 
                                    className="w-full p-3 border rounded-xl bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-science-500 outline-none transition min-h-[100px]"
                                    value={qOptions}
                                    onChange={e => setQOptions(e.target.value)}
                                    placeholder="Jā, Nē, Dažreiz"
                                />
                            </div>
                        )}

                        {qType === 'scale' && (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Min (1) apzīmējums</label>
                                    <input 
                                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                        value={qMinLabel}
                                        onChange={e => setQMinLabel(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Max (10) apzīmējums</label>
                                    <input 
                                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                        value={qMaxLabel}
                                        onChange={e => setQMaxLabel(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                        <button 
                            onClick={handleSaveQuestion}
                            className="w-full py-4 bg-science-600 text-white rounded-xl font-bold hover:bg-science-700 transition shadow-lg shadow-science-600/20 flex justify-center items-center gap-2 active:scale-95"
                        >
                            <Save size={20} /> {editingId ? 'Saglabāt Izmaiņas' : 'Pievienot Jautājumu'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};