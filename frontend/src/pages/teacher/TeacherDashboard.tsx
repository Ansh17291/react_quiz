import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { AnimatedWrapper, StaggeredList } from '../../components/shared/AnimatedComponents';
import { Button, Card, Spinner, Tabs } from '../../components/ui';
import { TrophyIcon, UploadIcon, SparklesIcon, XCircleIcon, PlusCircleIcon } from '../../components/Icons';
import { generateQuizFromText, generateSimilarQuestions } from '../../services/geminiService';
import { BASE, api } from '../../services/api';

const TeacherDashboard = () => {
    const { users, results } = useAppContext();
    const navigate = useNavigate();
    const students = users.filter(u => u.role === 'STUDENT');

    const [activeTab, setActiveTab] = useState('Overview');
    const [isCreating, setIsCreating] = useState(false);
    const [quizText, setQuizText] = useState('');
    const [uploadingGen, setUploadingGen] = useState(false);
    const txtInputRef = useRef<HTMLInputElement | null>(null);
    const genInputRef = useRef<HTMLInputElement | null>(null);
    const [numQuestions, setNumQuestions] = useState(10);
    const [error, setError] = useState('');

    const [manualTitle, setManualTitle] = useState('');
    const [manualQuestions, setManualQuestions] = useState<any>([
        { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
    ]);

    const leaderboard = useMemo(() => {
        return [...students].sort((a, b) => b.points - a.points);
    }, [students]);

    const studentPerformance = useMemo(() => {
        return students.map(student => {
            const studentResults = results.filter(r => r.userId === student.id);
            const avgScore = studentResults.length > 0 ? studentResults.reduce((acc, r) => acc + r.score, 0) / studentResults.length : 0;
            return { name: student.name, avgScore: Math.round(avgScore), quizzesTaken: studentResults.length };
        });
    }, [students, results]);
    
    const rankBadges = ['🥇', '🥈', '🥉'];

    return (
        <AnimatedWrapper className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
                <Tabs tabs={["Overview", "Create Quiz"]} activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            {activeTab === 'Overview' && (
            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Class Leaderboard (by Points)</h3>
                     <StaggeredList className="space-y-2">
                        {leaderboard.map((student, index) => (
                             <div key={student.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors" onClick={() => navigate(`/student/${student.id}`)}>
                                <span className="font-medium flex items-center gap-3">
                                    <span className={`text-xl w-6 text-center ${index < 3 ? '' : 'text-slate-400'}`}>{rankBadges[index] || index + 1}</span>
                                    {student.name}
                                </span>
                                <span className="font-bold text-yellow-400 flex items-center gap-1"><TrophyIcon className="w-5 h-5"/>{student.points}</span>
                            </div>
                        ))}
                    </StaggeredList>
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Student Performance Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={studentPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}/>
                            <Legend />
                            <Bar dataKey="avgScore" fill="#4f46e5" name="Average Score (%)" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
            )}

            {activeTab === 'Create Quiz' && (
            <div className="space-y-8">
                <Card>
                    <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-primary-400" />
                        Generate Quiz with AI
                    </h3>
                    <div className="space-y-4">
                        <textarea
                            value={quizText}
                            onChange={(e) => setQuizText(e.target.value)}
                            className="w-full h-40 p-2 border rounded-md bg-slate-700 border-slate-600 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Paste the content for the quiz here..."
                        />
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <label className="block">
                                <span className="text-gray-300">Questions to generate:</span>
                                <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value)))} className="mt-1 block w-28 rounded-md border-slate-600 shadow-sm bg-slate-700 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50" />
                            </label>
                            <div className="flex-grow"></div>
                            <label className="cursor-pointer">
                                <Button as="span" variant="secondary" onClick={() => txtInputRef.current?.click()}>
                                    <UploadIcon className="w-5 h-5" /> Upload .txt
                                </Button>
                            </label>
                            <input id="file-upload" type="file" accept=".txt" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => setQuizText(String(ev.target?.result || ''));
                                reader.readAsText(file);
                            }} ref={txtInputRef} />
                            <label className="cursor-pointer">
                                <Button as="span" variant="secondary" disabled={uploadingGen} onClick={() => genInputRef.current?.click()}>
                                    <UploadIcon className="w-5 h-5" /> Upload docx/xlsx/pptx
                                </Button>
                            </label>
                            <input id="gen-upload" type="file" accept=".docx,.xlsx,.pptx,.txt" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingGen(true);
                                try {
                                    const form = new FormData();
                                    form.append('file', file);
                                    const resp = await fetch(`${BASE}/api/quizzes/generate-from-upload`, { method: 'POST', body: form });
                                    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
                                    const data = await resp.json();
                                    if (data.text) setQuizText(data.text);
                                } finally {
                                    setUploadingGen(false);
                                }
                            }} ref={genInputRef} />
                            <Button onClick={async () => {
                                if (!quizText.trim()) {
                                    setError('Please provide some text to generate the quiz from.');
                                    return;
                                }
                                setIsCreating(true);
                                setError('');
                                try {
                                    const { title, questions } = await generateQuizFromText(quizText, numQuestions);
                                    await api.addQuiz({ title, questions } as any);
                                } catch (e: any) {
                                    setError(e.message || 'Failed to generate quiz');
                                } finally {
                                    setIsCreating(false);
                                }
                            }} disabled={isCreating}>
                                {isCreating ? (<><Spinner /> Generating...</>) : 'Generate & Create Quiz'}
                            </Button>
                        </div>
                        {error && <p className="text-red-500">{error}</p>}
                    </div>
                </Card>

                <Card>
                    <h3 className="text-xl font-semibold mb-4">Create Quiz Manually</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="Quiz Title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="w-full p-2 border rounded-md bg-slate-700 border-slate-600" />
                        <div className="space-y-4">
                            {manualQuestions.map((q: any, qIndex: number) => (
                                <div key={qIndex} className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-3 relative">
                                    {manualQuestions.length > 1 && (
                                        <button onClick={() => setManualQuestions(prev => prev.filter((_, i) => i !== qIndex))} className="absolute top-2 right-2 text-slate-500 hover:text-red-400">
                                            <XCircleIcon className="w-6 h-6" />
                                        </button>
                                    )}
                                    <textarea value={q.questionText} onChange={(e) => {
                                        const updated = [...manualQuestions];
                                        updated[qIndex].questionText = e.target.value;
                                        setManualQuestions(updated);
                                    }} placeholder={`Question ${qIndex + 1}`} className="w-full p-2 border rounded-md bg-slate-700 border-slate-600" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt: string, optIndex: number) => (
                                            <div key={optIndex} className="flex items-center gap-2">
                                                <input type="radio" name={`correct-${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => {
                                                    const updated = [...manualQuestions];
                                                    updated[qIndex].correctAnswerIndex = optIndex;
                                                    setManualQuestions(updated);
                                                }} className="h-5 w-5 text-primary-600 bg-slate-700 border-slate-500 focus:ring-primary-500" />
                                                <input type="text" placeholder={`Option ${optIndex + 1}`} value={opt} onChange={(e) => {
                                                    const updated = [...manualQuestions];
                                                    updated[qIndex].options[optIndex] = e.target.value;
                                                    setManualQuestions(updated);
                                                }} className="w-full p-2 border rounded-md bg-slate-700 border-slate-600" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <Button variant="secondary" onClick={() => setManualQuestions(prev => [...prev, { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }])}><PlusCircleIcon className="w-5 h-5" /> Add Question</Button>
                            <Button variant="secondary" disabled={isCreating} onClick={async () => {
                                if (manualQuestions.length === 0 || !manualQuestions[manualQuestions.length - 1].questionText.trim()) return;
                                const baseQuestion = manualQuestions[manualQuestions.length - 1];
                                setIsCreating(true);
                                try {
                                    const newQs = await generateSimilarQuestions(baseQuestion, 2);
                                    setManualQuestions(prev => [...prev, ...newQs]);
                                } finally {
                                    setIsCreating(false);
                                }
                            }}><SparklesIcon className="w-5 h-5" /> Generate with AI</Button>
                            <div className="flex-grow"></div>
                            <Button onClick={async () => {
                                if (!manualTitle.trim()) return;
                                setIsCreating(true);
                                try {
                                    await api.addQuiz({ title: manualTitle, questions: manualQuestions } as any);
                                    setManualTitle('');
                                    setManualQuestions([{ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
                                } finally {
                                    setIsCreating(false);
                                }
                            }}>Create Quiz</Button>
                        </div>
                    </div>
                </Card>
            </div>
            )}
        </AnimatedWrapper>
    );
};

export default TeacherDashboard;
