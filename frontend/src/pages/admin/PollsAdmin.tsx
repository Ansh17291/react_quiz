import React, { useEffect, useState, useRef } from "react";
import { api } from "../../services/api";
import { Card, Button, useToast } from "../../components/ui";

const ADMIN_POLL_INTERVAL = 800; // ms - fetch sessions every 800ms for live view

const PollsAdmin: React.FC = () => {
    const [polls, setPolls] = useState<any[]>([]);
    const [sessions, setSessions] = useState<Record<string, any>>({});
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState<any[]>([
        { questionText: "", options: ["", "", "", ""] },
    ]);
    const [timeLimit, setTimeLimit] = useState<number>(30);
    const [studentsList, setStudentsList] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [createdPoll, setCreatedPoll] = useState<any | null>(null);
    const [reassignPoll, setReassignPoll] = useState<any | null>(null);
    const [reassignStudents, setReassignStudents] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>("");
    const [startTime, setStartTime] = useState<string>("");
    const [reassignDate, setReassignDate] = useState<string>("");
    const [reassignTime, setReassignTime] = useState<string>("");
    const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>({});
    const { addToast } = useToast();
    const sessionRefreshRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const all = await api.getPolls();
                setPolls(all || []);
                // Initial fetch of sessions
                const sessMap: Record<string, any> = {};
                await Promise.all((all || []).map(async (p: any) => {
                    try {
                        const s = await api.getPollSession(p._id || p.id);
                        if (s) sessMap[p._id || p.id] = s;
                    } catch (e) { }
                }));
                setSessions(sessMap);
            } catch (e) {
                console.error(e);
                addToast('Failed to load polls', 'error');
            }
        })();
    }, []);

    // Real-time session polling for live updates
    useEffect(() => {
        const pollSessions = async () => {
            if (polls.length === 0) return;
            try {
                const sessMap: Record<string, any> = {};
                await Promise.all(polls.map(async (p: any) => {
                    try {
                        const s = await api.getPollSession(p._id || p.id);
                        if (s) sessMap[p._id || p.id] = s;
                    } catch (e) { }
                }));
                setSessions(sessMap);
            } catch (e) {
                console.error(e);
            }
        };

        // Poll immediately and then periodically
        pollSessions();
        if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current);
        sessionRefreshRef.current = setInterval(pollSessions, ADMIN_POLL_INTERVAL);

        return () => {
            if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current);
        };
    }, [polls]);

    const addQuestion = () => setQuestions((s) => [...s, { questionText: "", options: ["", "", "", ""] }]);
    const removeQuestion = (i: number) => setQuestions((s) => s.filter((_, idx) => idx !== i));
    const setQuestionText = (i: number, v: string) => setQuestions((s) => s.map((q, idx) => (idx === i ? { ...q, questionText: v } : q)));
    const setQuestionOption = (qIdx: number, optIdx: number, v: string) => setQuestions((s) => s.map((q, idx) => idx === qIdx ? { ...q, options: q.options.map((o: string, oi: number) => oi === optIdx ? v : o) } : q));

    useEffect(() => {
        (async () => {
            try {
                const users = await api.getUsers();
                setStudentsList((users || []).filter((u: any) => u.role === 'STUDENT'));
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    const handleCreate = async () => {
        // validate
        if (!title.trim() || questions.length === 0 || questions.some(q => !q.questionText.trim() || (q.options || []).filter((o: string) => o.trim()).length < 2)) {
            addToast("Provide title and each question must have text and at least two options", "error");
            return;
        }
        try {
            const payload = { title, questions: questions.map((q) => ({ questionText: q.questionText, options: (q.options || []).filter((o: string) => o.trim()) })) };
            const created = await api.createPoll(payload as any);
            addToast(`✓ Poll "${title}" created with ${questions.length} question(s)`, "success");
            setPolls((p) => [created, ...p]);
            setCreatedPoll(created);
            setTitle("");
            setQuestions([{ questionText: "", options: ["", "", "", ""] }]);
        } catch (e: any) {
            console.error(e);
            addToast(e?.response?.data?.message || "Failed to create poll", "error");
        }
    };

    const handleStart = async (pollId: string) => {
        const key = `start-${pollId}`;
        setLoadingButtons((prev) => ({ ...prev, [key]: true }));
        try {
            await api.startPoll(pollId, timeLimit);
            addToast("✓ Poll started", "success");
            setSessions((prev) => ({
                ...prev,
                [pollId]: { ...prev[pollId], active: true, timeLeft: timeLimit * 1000 }
            }));
        } catch (e: any) {
            console.error(e);
            addToast(e?.response?.data?.message || "Failed to start poll", "error");
        } finally {
            setLoadingButtons((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleAdvance = async (pollId: string) => {
        const key = `advance-${pollId}`;
        setLoadingButtons((prev) => ({ ...prev, [key]: true }));
        try {
            await api.advancePoll(pollId, timeLimit);
            addToast("✓ Advanced to next question", "success");
        } catch (e: any) {
            console.error(e);
            addToast(e?.response?.data?.message || "Failed to advance poll", "error");
        } finally {
            setLoadingButtons((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleAssign = async () => {
        if (!createdPoll) return addToast('No poll selected to assign', 'error');
        if (!selectedStudents.length) return addToast('Select at least one student', 'error');
        try {
            const deadline = startDate && startTime ? `${startDate}T${startTime}:00Z` : null;
            await api.assignPoll(createdPoll._id || createdPoll.id, { studentIds: selectedStudents, deadline, timeLimit, isLive: false });
            addToast(`✓ Poll assigned to ${selectedStudents.length} student(s)`, 'success');
            // clear selection
            setCreatedPoll(null);
            setSelectedStudents([]);
            setStartDate("");
            setStartTime("");
        } catch (e: any) {
            console.error(e);
            addToast(e?.response?.data?.message || 'Failed to assign poll', 'error');
        }
    };

    const handleReassign = async () => {
        if (!reassignPoll) return addToast('No poll selected', 'error');
        if (!reassignStudents.length) return addToast('Select at least one student', 'error');
        try {
            const deadline = reassignDate && reassignTime ? `${reassignDate}T${reassignTime}:00Z` : null;
            await api.assignPoll(reassignPoll._id || reassignPoll.id, { studentIds: reassignStudents, deadline, timeLimit, isLive: false });
            addToast(`✓ Poll reassigned to ${reassignStudents.length} student(s)`, 'success');
            // clear selection
            setReassignPoll(null);
            setReassignStudents([]);
            setReassignDate("");
            setReassignTime("");
        } catch (e: any) {
            console.error(e);
            addToast(e?.response?.data?.message || 'Failed to reassign poll', 'error');
        }
    };

    const handleDelete = async (pollId: string) => {
        if (!window.confirm('Are you sure you want to delete this poll?')) return;
        try {
            await api.deletePoll(pollId);
            setPolls((p) => p.filter((poll) => (poll._id || poll.id) !== pollId));
            addToast('Poll deleted', 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to delete poll', 'error');
        }
    };

    return (
        <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">📊 Poll Management</h1>
                    <p className="text-slate-400">Create, manage, and analyze polls for your students</p>
                </div>

                {/* Create Poll Card */}
                <Card className="mb-8 border border-slate-700 bg-slate-950">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-blue-400">
                        <span>➕ Create New Poll</span>
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">Poll Title</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Chapter 1 Quiz" className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white" />
                        </div>

                        {/* Questions Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-400">Questions ({questions.length})</label>
                                <Button variant="secondary" onClick={addQuestion} className="text-xs">+ Add Question</Button>
                            </div>
                            {questions.map((q, qi) => (
                                <div key={qi} className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <strong className="text-blue-400">Question {qi + 1}</strong>
                                        {questions.length > 1 && (
                                            <button onClick={() => removeQuestion(qi)} className="text-red-500 hover:text-red-400 text-sm font-semibold">✕ Remove</button>
                                        )}
                                    </div>
                                    <textarea value={q.questionText} onChange={(e) => setQuestionText(qi, e.target.value)} placeholder={`What is your question?`} className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none text-white mb-3 resize-none" rows={2} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {(q.options || []).map((opt: string, oi: number) => (
                                            <input key={oi} value={opt} onChange={(e) => setQuestionOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="p-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none text-white text-sm" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Time Limit & Create */}
                        <div className="flex gap-3 items-center pt-4 border-t border-slate-700">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-400">Time Limit:</label>
                                <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="w-20 p-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white" />
                                <span className="text-slate-400">seconds</span>
                            </div>
                            <div className="flex-1"></div>
                            <Button onClick={handleCreate} className="px-6">Create Poll</Button>
                        </div>
                    </div>
                </Card>

                {/* Assignment Cards */}
                {createdPoll && (
                    <Card className="mb-8 border border-green-900 bg-slate-950">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
                            <span>👥 Assign to Students</span>
                            <span className="text-sm bg-green-900 px-2 py-1 rounded">New Poll</span>
                        </h3>
                        <div className="text-sm text-slate-300 mb-4 p-2 bg-slate-800 rounded">{createdPoll.title || `Poll with ${(createdPoll.questions || []).length} questions`}</div>

                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm text-slate-400">Select Students ({selectedStudents.length}/{studentsList.length})</label>
                                <button
                                    onClick={() => {
                                        if (selectedStudents.length === studentsList.length) {
                                            setSelectedStudents([]);
                                        } else {
                                            setSelectedStudents(studentsList.map((s) => s._id || s.id));
                                        }
                                    }}
                                    className="text-xs bg-blue-900 hover:bg-blue-800 text-blue-300 px-3 py-1 rounded transition-colors"
                                >
                                    {selectedStudents.length === studentsList.length ? '✓ Deselect All' : '☑ Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto border border-slate-700 rounded-lg p-2 bg-slate-800">
                                {studentsList.map((s) => (
                                    <label key={s._id || s.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors">
                                        <input type="checkbox" checked={selectedStudents.includes(s._id || s.id)} onChange={(e) => {
                                            const id = s._id || s.id;
                                            setSelectedStudents((prev) => e.target.checked ? [...prev, id] : prev.filter(x => x !== id));
                                        }} className="cursor-pointer" />
                                        <div className="flex-1">
                                            <div className="font-medium text-white">{s.name}</div>
                                            <div className="text-xs text-slate-400">{s.email || ''}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 mb-4 pb-4 border-b border-slate-700">
                            <div className="flex-1">
                                <label className="text-sm text-slate-400 block mb-2">Start Date (Optional)</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white" />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm text-slate-400 block mb-2">Start Time (Optional)</label>
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white" />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleAssign} className="px-6">Assign to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}</Button>
                        </div>
                    </Card>
                )}

                {reassignPoll && (
                    <Card className="mb-8 border border-yellow-900 bg-slate-950">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
                            <span>🔄 Reassign Poll</span>
                        </h3>
                        <div className="text-sm text-slate-300 mb-4 p-2 bg-slate-800 rounded">{reassignPoll.title || `Poll with ${(reassignPoll.questions || []).length} questions`}</div>

                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm text-slate-400">Select Students ({reassignStudents.length}/{studentsList.length})</label>
                                <button
                                    onClick={() => {
                                        if (reassignStudents.length === studentsList.length) {
                                            setReassignStudents([]);
                                        } else {
                                            setReassignStudents(studentsList.map((s) => s._id || s.id));
                                        }
                                    }}
                                    className="text-xs bg-blue-900 hover:bg-blue-800 text-blue-300 px-3 py-1 rounded transition-colors"
                                >
                                    {reassignStudents.length === studentsList.length ? '✓ Deselect All' : '☑ Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto border border-slate-700 rounded-lg p-2 bg-slate-800">
                                {studentsList.map((s) => (
                                    <label key={s._id || s.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors">
                                        <input type="checkbox" checked={reassignStudents.includes(s._id || s.id)} onChange={(e) => {
                                            const id = s._id || s.id;
                                            setReassignStudents((prev) => e.target.checked ? [...prev, id] : prev.filter(x => x !== id));
                                        }} className="cursor-pointer" />
                                        <div className="flex-1">
                                            <div className="font-medium text-white">{s.name}</div>
                                            <div className="text-xs text-slate-400">{s.email || ''}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 mb-4 pb-4 border-b border-slate-700">
                            <div className="flex-1">
                                <label className="text-sm text-slate-400 block mb-2">Start Date (Optional)</label>
                                <input type="date" value={reassignDate} onChange={(e) => setReassignDate(e.target.value)} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white" />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm text-slate-400 block mb-2">Start Time (Optional)</label>
                                <input type="time" value={reassignTime} onChange={(e) => setReassignTime(e.target.value)} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none text-white" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => {
                                setReassignPoll(null);
                                setReassignStudents([]);
                                setReassignDate("");
                                setReassignTime("");
                            }}>Cancel</Button>
                            <Button onClick={handleReassign} className="px-6">Reassign to {reassignStudents.length} Student{reassignStudents.length !== 1 ? 's' : ''}</Button>
                        </div>
                    </Card>
                )}

                {/* Active Polls Section */}
                <div>
                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-purple-400">
                        <span>📋 All Polls</span>
                        <span className="text-sm bg-purple-900 px-3 py-1 rounded-full">{polls.length}</span>
                    </h3>
                    {polls.length === 0 ? (
                        <Card className="text-center py-12 border border-slate-700">
                            <p className="text-slate-400 text-lg">No polls yet. Create one to get started!</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {polls.map((p) => {
                                const sess = sessions[p._id || p.id];
                                const isLive = sess && sess.active;
                                const pollId = p._id || p.id;
                                const totalVotes = sess?.votes?.reduce((sum: number, v: number) => sum + (v || 0), 0) || 0;
                                return (
                                    <Card key={pollId} className={`border transition-colors ${isLive ? 'border-green-900 bg-green-950' : 'border-slate-700 bg-slate-950'}`}>
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-lg font-semibold text-white">{p.title || `Poll (${(p.questions || []).length} questions)`}</h4>
                                                    {isLive && (
                                                        <span className="inline-flex items-center gap-1 bg-green-900 text-green-300 text-xs font-bold px-2 py-1 rounded-full">
                                                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> LIVE
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 mb-3">{(p.questions || []).map((q: any) => q.questionText).slice(0, 2).join(' • ')}{(p.questions || []).length > 2 ? ' ...' : ''}</p>

                                                {/* Live Status */}
                                                {isLive && sess && (
                                                    <div className="bg-slate-900 rounded p-3 mb-3 border border-green-900">
                                                        <div className="grid grid-cols-4 gap-2 text-xs">
                                                            <div><span className="text-slate-400">Question:</span> <span className="font-bold text-green-300">{(sess.currentQuestionIndex || 0) + 1}/{(p.questions || []).length}</span></div>
                                                            <div><span className="text-slate-400">Time Left:</span> <span className="font-bold text-yellow-300">{Math.ceil((sess.timeLeft || 0) / 1000)}s</span></div>
                                                            <div><span className="text-slate-400">Total Votes:</span> <span className="font-bold text-blue-300">{totalVotes}</span></div>
                                                            <div><span className="text-slate-400">Participants:</span> <span className="font-bold text-purple-300">{sess.voters?.length || 0}</span></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 items-start flex-wrap justify-end">
                                                <Button
                                                    disabled={loadingButtons[`start-${pollId}`] || isLive}
                                                    onClick={() => handleStart(pollId)}
                                                    className="whitespace-nowrap"
                                                >
                                                    {loadingButtons[`start-${pollId}`] ? '⏳' : '▶'} Start ({timeLimit}s)
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    disabled={isLive}
                                                    onClick={() => {
                                                        setReassignPoll(p);
                                                        setReassignStudents([]);
                                                        setReassignDate("");
                                                        setReassignTime("");
                                                    }}
                                                    className="whitespace-nowrap"
                                                >
                                                    🔄 Reassign
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    disabled={loadingButtons[`delete-${pollId}`]}
                                                    onClick={() => handleDelete(pollId)}
                                                    className="text-red-400 hover:text-red-300 whitespace-nowrap"
                                                >
                                                    {loadingButtons[`delete-${pollId}`] ? '⏳' : '🗑'} Delete
                                                </Button>
                                                {isLive && (
                                                    <Button
                                                        variant="secondary"
                                                        disabled={loadingButtons[`advance-${pollId}`]}
                                                        onClick={() => handleAdvance(pollId)}
                                                        className="text-yellow-400 hover:text-yellow-300 whitespace-nowrap"
                                                    >
                                                        {loadingButtons[`advance-${pollId}`] ? '⏳' : '⏭'} Advance
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PollsAdmin;
