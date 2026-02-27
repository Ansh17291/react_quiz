import React, { useEffect, useState, useRef, useMemo } from "react";
import { api } from "../../services/api";
import { Card, Button, useToast } from "../../components/ui";
import MultiSelectDropdown from "../../components/shared/MultiSelectDropdown";

const ADMIN_POLL_INTERVAL = 800;

const inputStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '8px',
    padding: '10px 12px',
    width: '100%',
    outline: 'none',
};

const labelStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '14px',
    marginBottom: '6px',
    display: 'block',
};

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
                const sessMap: Record<string, any> = {};
                await Promise.all((all || []).map(async (p: any) => {
                    try {
                        const s = await api.getPollSession(p._id || p.id);
                        if (s) sessMap[p._id || p.id] = s;
                    } catch (e) { }
                }));
                setSessions(sessMap);
                const users = await api.getUsers();
                setStudentsList((users || []).filter((u: any) => u.role === 'STUDENT'));
            } catch (e) {
                console.error(e);
                addToast('Failed to load initial data', 'error');
            }
        })();
    }, []);

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
            } catch (e) { console.error(e); }
        };
        pollSessions();
        if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current);
        sessionRefreshRef.current = setInterval(pollSessions, ADMIN_POLL_INTERVAL);
        return () => { if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current); };
    }, [polls]);

    const addQuestion = () => setQuestions((s) => [...s, { questionText: "", options: ["", "", "", ""] }]);
    const removeQuestion = (i: number) => setQuestions((s) => s.filter((_, idx) => idx !== i));
    const setQuestionText = (i: number, v: string) => setQuestions((s) => s.map((q, idx) => (idx === i ? { ...q, questionText: v } : q)));
    const setQuestionOption = (qIdx: number, optIdx: number, v: string) => setQuestions((s) => s.map((q, idx) => idx === qIdx ? { ...q, options: q.options.map((o: string, oi: number) => oi === optIdx ? v : o) } : q));

    const studentOptions = useMemo(() => studentsList.map((s: any) => ({ id: s._id || s.id, name: s.name })), [studentsList]);

    const handleCreate = async () => {
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
            addToast(e?.response?.data?.message || "Failed to create poll", "error");
        }
    };

    const handleStart = async (pollId: string) => {
        const key = `start-${pollId}`;
        setLoadingButtons((prev) => ({ ...prev, [key]: true }));
        try {
            await api.startPoll(pollId, timeLimit);
            addToast("✓ Poll started", "success");
            setSessions((prev) => ({ ...prev, [pollId]: { ...prev[pollId], active: true, timeLeft: timeLimit * 1000 } }));
        } catch (e: any) {
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
            setCreatedPoll(null); setSelectedStudents([]); setStartDate(""); setStartTime("");
        } catch (e: any) {
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
            setReassignPoll(null); setReassignStudents([]); setReassignDate(""); setReassignTime("");
        } catch (e: any) {
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
            addToast('Failed to delete poll', 'error');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>Poll Management</h1>
                <p style={{ color: 'var(--text-muted)' }}>Create, manage, and analyze polls for your students</p>
            </div>

            {/* Create Poll Card */}
            <Card>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                    Create New Poll
                </h3>
                <div className="space-y-4">
                    <div>
                        <label style={labelStyle}>Poll Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Chapter 1 Quiz"
                            style={inputStyle}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label style={labelStyle}>Questions ({questions.length})</label>
                            <Button variant="secondary" onClick={addQuestion} className="text-xs">+ Add Question</Button>
                        </div>
                        {questions.map((q, qi) => (
                            <div key={qi} className="p-4 rounded-lg theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                <div className="flex justify-between items-center mb-3">
                                    <strong style={{ color: 'var(--accent)' }}>Question {qi + 1}</strong>
                                    {questions.length > 1 && (
                                        <button onClick={() => removeQuestion(qi)} className="text-sm font-semibold" style={{ color: 'var(--error)' }}>✕ Remove</button>
                                    )}
                                </div>
                                <textarea
                                    value={q.questionText}
                                    onChange={(e) => setQuestionText(qi, e.target.value)}
                                    placeholder="What is your question?"
                                    style={{ ...inputStyle, resize: 'none', marginBottom: '12px' }}
                                    rows={2}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {(q.options || []).map((opt: string, oi: number) => (
                                        <input
                                            key={oi}
                                            value={opt}
                                            onChange={(e) => setQuestionOption(qi, oi, e.target.value)}
                                            placeholder={`Option ${oi + 1}`}
                                            style={{ ...inputStyle, padding: '8px 10px', fontSize: '14px' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 items-center pt-4 theme-transition" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2">
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Time Limit:</label>
                            <input
                                type="number"
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(Number(e.target.value))}
                                style={{ ...inputStyle, width: '80px', padding: '8px' }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>seconds</span>
                        </div>
                        <div className="flex-1" />
                        <Button onClick={handleCreate} className="px-6">Create Poll</Button>
                    </div>
                </div>
            </Card>

            {/* Assign Card */}
            {createdPoll && (
                <Card>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--success)' }}>
                        Assign to Students
                        <span className="text-sm px-2 py-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>New Poll</span>
                    </h3>
                    <div className="text-sm mb-4 p-2 rounded theme-transition" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {createdPoll.title || `Poll with ${(createdPoll.questions || []).length} questions`}
                    </div>
                    <div className="mb-4">
                        <MultiSelectDropdown options={studentOptions} selectedIds={selectedStudents} onSelect={setSelectedStudents} placeholder="Choose students..." label="Select Students" />
                    </div>
                    <div className="flex gap-3 mb-4 pb-4 theme-transition" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex-1">
                            <label style={labelStyle}>Start Date (Optional)</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                        </div>
                        <div className="flex-1">
                            <label style={labelStyle}>Start Time (Optional)</label>
                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAssign} className="px-6">Assign to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}</Button>
                    </div>
                </Card>
            )}

            {/* Reassign Card */}
            {reassignPoll && (
                <Card>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                        Reassign Poll
                    </h3>
                    <div className="text-sm mb-4 p-2 rounded theme-transition" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {reassignPoll.title || `Poll with ${(reassignPoll.questions || []).length} questions`}
                    </div>
                    <div className="mb-4">
                        <MultiSelectDropdown options={studentOptions} selectedIds={reassignStudents} onSelect={setReassignStudents} placeholder="Choose students..." label="Select Students" />
                    </div>
                    <div className="flex gap-3 mb-4 pb-4 theme-transition" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex-1">
                            <label style={labelStyle}>Start Date (Optional)</label>
                            <input type="date" value={reassignDate} onChange={(e) => setReassignDate(e.target.value)} style={inputStyle} />
                        </div>
                        <div className="flex-1">
                            <label style={labelStyle}>Start Time (Optional)</label>
                            <input type="time" value={reassignTime} onChange={(e) => setReassignTime(e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => { setReassignPoll(null); setReassignStudents([]); setReassignDate(""); setReassignTime(""); }}>Cancel</Button>
                        <Button onClick={handleReassign} className="px-6">Reassign to {reassignStudents.length} Student{reassignStudents.length !== 1 ? 's' : ''}</Button>
                    </div>
                </Card>
            )}

            {/* All Polls */}
            <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                    All Polls
                    <span className="text-sm px-3 py-1 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{polls.length}</span>
                </h3>
                {polls.length === 0 ? (
                    <Card className="text-center py-12">
                        <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No polls yet. Create one to get started!</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {polls.map((p) => {
                            const sess = sessions[p._id || p.id];
                            const isLive = sess && sess.active;
                            const pollId = p._id || p.id;
                            const totalVotes = sess?.votes?.reduce((sum: number, v: number) => sum + (v || 0), 0) || 0;
                            return (
                                <Card key={pollId} className="theme-transition" style={isLive ? { border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.05)' } : undefined}>
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{p.title || `Poll (${(p.questions || []).length} questions)`}</h4>
                                                {isLive && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> LIVE
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{(p.questions || []).map((q: any) => q.questionText).slice(0, 2).join(' • ')}{(p.questions || []).length > 2 ? ' ...' : ''}</p>

                                            {isLive && sess && (
                                                <div className="rounded p-3 mb-3 theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                                        <div><span style={{ color: 'var(--text-muted)' }}>Question:</span> <span className="font-bold" style={{ color: '#10b981' }}>{(sess.currentQuestionIndex || 0) + 1}/{(p.questions || []).length}</span></div>
                                                        <div><span style={{ color: 'var(--text-muted)' }}>Time Left:</span> <span className="font-bold" style={{ color: 'var(--warning)' }}>{Math.ceil((sess.timeLeft || 0) / 1000)}s</span></div>
                                                        <div><span style={{ color: 'var(--text-muted)' }}>Votes:</span> <span className="font-bold" style={{ color: 'var(--info)' }}>{totalVotes}</span></div>
                                                        <div><span style={{ color: 'var(--text-muted)' }}>Participants:</span> <span className="font-bold" style={{ color: 'var(--accent)' }}>{sess.voters?.length || 0}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 items-start flex-wrap justify-end">
                                            <Button disabled={loadingButtons[`start-${pollId}`] || isLive} onClick={() => handleStart(pollId)} className="whitespace-nowrap">
                                                {loadingButtons[`start-${pollId}`] ? '⏳' : '▶'} Start ({timeLimit}s)
                                            </Button>
                                            <Button variant="secondary" disabled={isLive} onClick={() => { setReassignPoll(p); setReassignStudents([]); setReassignDate(""); setReassignTime(""); }} className="whitespace-nowrap">
                                                🔄 Reassign
                                            </Button>
                                            <Button variant="secondary" disabled={loadingButtons[`delete-${pollId}`]} onClick={() => handleDelete(pollId)} className="text-red-400 hover:text-red-300 whitespace-nowrap">
                                                {loadingButtons[`delete-${pollId}`] ? '⏳' : '🗑'} Delete
                                            </Button>
                                            {isLive && (
                                                <Button variant="secondary" disabled={loadingButtons[`advance-${pollId}`]} onClick={() => handleAdvance(pollId)} className="whitespace-nowrap" style={{ color: 'var(--warning)' }}>
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
    );
};

export default PollsAdmin;
