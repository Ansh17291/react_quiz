import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAppContext } from "../../context/AppContext";
import { Card, Button, Spinner, useToast } from "../../components/ui";

const POLL_POLL_INTERVAL = 500;
const SESSION_TIMEOUT = 3000;

const PollTaker: React.FC = () => {
    const { pollId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAppContext();
    const { addToast } = useToast();
    const [polls, setPolls] = useState<any[]>([]);
    const [poll, setPoll] = useState<any | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [voting, setVoting] = useState(false);
    const [clientTimer, setClientTimer] = useState<number | null>(null);
    const [connectionError, setConnectionError] = useState(false);
    const intervalRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const all = await api.getPolls();
                if (!mounted) return;
                setPolls(all || []);
                const found = (all || []).find((p: any) => (p._id || p.id) === pollId);
                setPoll(found || null);
                if (found) {
                    try {
                        const assign = await api.getPollAssignment(found._id || found.id);
                        setPoll({ ...found, assignment: assign });
                    } catch (e) { }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [pollId]);

    useEffect(() => {
        if (session && session.timeLeft !== null && session.timeLeft > 0) {
            setClientTimer(session.timeLeft);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = window.setInterval(() => {
                setClientTimer((prev) => {
                    if (prev === null || prev <= 0) return prev;
                    return Math.max(0, prev - 1000);
                });
            }, 1000);
        } else if (session && session.timeLeft === 0) {
            setClientTimer(0);
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [session?.timeLeft, session?.active]);

    useEffect(() => {
        const tick = async () => {
            if (!poll) return;
            try {
                const s = await api.getPollSession(poll._id || poll.id);
                setSession(s);
                setConnectionError(false);
                if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
                sessionTimeoutRef.current = setTimeout(() => {
                    if (!connectionError) setConnectionError(true);
                }, SESSION_TIMEOUT);
                if (s && s.voters && (s.voters as any[]).length > 0) {
                    if (currentUser) {
                        const uid = currentUser._id || currentUser.id;
                        if (s.voters && s.voters.includes(uid)) setHasVoted(true);
                    }
                }
            } catch (e) {
                console.error(e);
                setConnectionError(true);
            }
        };
        tick();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(tick, POLL_POLL_INTERVAL);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
        };
    }, [poll, currentUser, connectionError]);

    useEffect(() => {
        if (!session) return;
        if (session.timeLeft === 0) {
            const t = setTimeout(() => { advanceToNextPoll(); }, 4000);
            return () => clearTimeout(t);
        }
    }, [session]);

    const totalVotes = useMemo(() => {
        if (!session || !session.votes) return 0;
        return session.votes.reduce((s: number, v: number) => s + (v || 0), 0);
    }, [session]);

    const handleVote = async (index: number) => {
        if (!poll || hasVoted || voting) return;
        if (poll.assignment && currentUser) {
            const uid = currentUser._id || currentUser.id;
            const assigned = (poll.assignment.studentIds || []).map((s: any) => (s._id || s.id || s)).map(String);
            if (!assigned.includes(String(uid))) {
                addToast('You are not assigned to this poll', 'error');
                return;
            }
        }
        setSelected(index);
        setVoting(true);
        try {
            await api.votePoll(poll._id || poll.id, index, currentUser ? (currentUser._id || currentUser.id) : undefined);
            setHasVoted(true);
            addToast('✓ Vote recorded!', 'success');
        } catch (e: any) {
            addToast(e?.response?.data?.message || 'Failed to record vote', 'error');
            setSelected(null);
        } finally {
            setVoting(false);
        }
    };

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (hasVoted || voting || !session || (clientTimer === 0 || session.active === false)) return;
            const qIndex = session?.currentQuestionIndex ?? 0;
            const question = (poll?.questions || [])[qIndex];
            const optCount = (question?.options || []).length;
            if (e.key === 'ArrowUp') { e.preventDefault(); if (selected === null) setSelected(optCount - 1); else if (selected > 0) setSelected(selected - 1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); if (selected === null) setSelected(0); else if (selected < optCount - 1) setSelected(selected + 1); }
            else if (e.key === 'Enter' && selected !== null) { e.preventDefault(); handleVote(selected); }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selected, session, voting, hasVoted, poll, clientTimer]);

    const handleRefreshSession = async () => {
        try {
            setConnectionError(false);
            const s = await api.getPollSession(poll._id || poll.id);
            setSession(s);
            addToast('✓ Reconnected', 'success');
        } catch (e) {
            addToast('Failed to reconnect', 'error');
        }
    };

    const advanceToNextPoll = () => {
        if (!polls || polls.length === 0 || !poll) { navigate("/student"); return; }
        const idx = polls.findIndex((p) => (p._id || p.id) === (poll._id || poll.id));
        if (idx < 0 || idx + 1 >= polls.length) navigate("/student");
        else { const next = polls[idx + 1]; navigate(`/poll/${next._id || next.id}`); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

    if (!poll) return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-2xl text-center">
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>No poll found</h2>
                <p style={{ color: 'var(--text-muted)' }}>This poll may not exist or hasn't been created yet.</p>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen flex items-start justify-center p-6" style={{ background: 'var(--bg)' }}>
            <Card className="w-full max-w-4xl">
                {/* Connection Error Banner */}
                {connectionError && (
                    <div className="mb-4 p-3 rounded-lg flex items-center justify-between animate-pulse" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
                        <span className="flex items-center gap-2" style={{ color: 'var(--error)' }}>⚠️ Connection lost. Some updates may be delayed.</span>
                        <button onClick={handleRefreshSession} className="text-xs px-3 py-1 rounded font-semibold transition-colors" style={{ background: 'var(--error)', color: '#fff' }}>
                            Reconnect
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>{poll.title || `Poll`}</h2>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Question <span className="font-bold" style={{ color: 'var(--accent)' }}>{(session?.currentQuestionIndex ?? 0) + 1}</span> of <span className="font-bold" style={{ color: 'var(--text)' }}>{(poll.questions || []).length}</span>
                        </div>
                        <div className="flex-1 mx-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div
                                style={{ width: `${((session?.currentQuestionIndex ?? 0) + 1) / (poll.questions || []).length * 100}%`, background: 'var(--accent)' }}
                                className="h-full transition-all duration-300"
                            />
                        </div>
                    </div>

                    {session && session.timeLeft !== null && (
                        <div className="flex items-center gap-2">
                            <div style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                backgroundColor: (clientTimer || 0) < 5000 && (clientTimer || 0) > 0 ? 'rgba(239,68,68,0.2)' : (clientTimer || 0) === 0 ? 'rgba(239,68,68,0.3)' : 'var(--accent-light)',
                                color: (clientTimer || 0) < 5000 ? 'var(--error)' : 'var(--accent)',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                minWidth: '100px',
                                textAlign: 'center',
                                border: `1px solid ${(clientTimer || 0) < 5000 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                            }}>
                                ⏱ {Math.ceil((clientTimer || 0) / 1000)}s
                            </div>
                            {clientTimer === 0 && <span className="text-sm font-semibold animate-pulse" style={{ color: 'var(--warning)' }}>📊 Results Shown</span>}
                        </div>
                    )}
                </div>

                {/* Question Text */}
                {(() => {
                    const qIndex = session?.currentQuestionIndex ?? 0;
                    const question = (poll.questions || [])[qIndex];
                    return question && question.questionText ? (
                        <div className="mb-6 p-4 rounded-lg theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{question.questionText}</p>
                        </div>
                    ) : null;
                })()}

                {/* Options */}
                <div className="space-y-3 mb-6">
                    {(() => {
                        const qIndex = session?.currentQuestionIndex ?? 0;
                        const question = (poll.questions || [])[qIndex] || { questionText: '', options: [] };
                        const isSessionExpired = session && (clientTimer === 0 || session.active === false);
                        return (question.options || []).map((opt: string, i: number) => {
                            const votes = session?.votes?.[i] || 0;
                            const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                            const isSelected = selected === i;
                            return (
                                <div key={i}>
                                    <button
                                        onClick={() => handleVote(i)}
                                        disabled={hasVoted || isSessionExpired || voting}
                                        style={{
                                            borderColor: isSelected && !isSessionExpired ? 'var(--accent)' : 'var(--border)',
                                            backgroundColor: isSelected && !isSessionExpired ? 'var(--accent-light)' : 'var(--surface-2)',
                                            opacity: isSessionExpired ? 0.75 : voting && isSelected ? 0.7 : 1,
                                            width: '100%', textAlign: 'left', padding: '12px 16px',
                                            borderRadius: '8px', border: '2px solid',
                                            transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            cursor: isSessionExpired ? 'default' : 'pointer',
                                        }}
                                    >
                                        <div className="flex-1">
                                            <span className="block font-medium" style={{ color: 'var(--text)' }}>{opt}</span>
                                            {isSelected && !isSessionExpired && !hasVoted && !voting && (
                                                <span className="text-xs mt-1" style={{ color: 'var(--success)' }}>✓ Selected (Press Enter to submit)</span>
                                            )}
                                            {voting && isSelected && (
                                                <span className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--info)' }}>
                                                    <span className="inline-block animate-spin">⏳</span> Submitting...
                                                </span>
                                            )}
                                            {isSelected && hasVoted && (
                                                <span className="text-xs mt-1" style={{ color: 'var(--success)' }}>✓ Your vote</span>
                                            )}
                                        </div>
                                        <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>{votes}</span>
                                    </button>

                                    {isSessionExpired && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                                <div style={{ width: `${percent}%`, background: 'var(--accent)' }} className="h-full transition-all duration-700 flex items-center justify-end pr-2">
                                                    {percent > 10 && <span className="text-xs font-bold text-white">{percent}%</span>}
                                                </div>
                                            </div>
                                            <span className="text-sm font-semibold w-12 text-right" style={{ color: 'var(--accent)' }}>{percent}%</span>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg mb-6 theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Votes</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{totalVotes}</p>
                    </div>
                    {hasVoted ? (
                        <div className="text-center">
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Status</p>
                            <p className="text-lg font-semibold" style={{ color: 'var(--success)' }}>✓ Voted</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your Vote</p>
                            <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Pending</p>
                        </div>
                    )}
                    <div className="text-right">
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Participants</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent-2)' }}>{session?.voters?.length || 0}</p>
                    </div>
                </div>

                {/* Keyboard Hint */}
                {!hasVoted && clientTimer !== 0 && (
                    <div className="text-xs text-center mb-4 p-2 rounded theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-subtle)' }}>
                        💡 Tip: Use ↑↓ arrow keys to navigate options, press Enter to submit
                    </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => navigate('/student')}>Exit Poll</Button>
                </div>
            </Card>
        </div>
    );
};

export default PollTaker;
