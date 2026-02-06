import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAppContext } from "../../context/AppContext";
import { Card, Button, Spinner, useToast } from "../../components/ui";

const POLL_POLL_INTERVAL = 500; // ms - faster polling for real-time updates
const SESSION_TIMEOUT = 3000; // ms - show connection error after this

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
    const [clientTimer, setClientTimer] = useState<number | null>(null); // Client-side countdown
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
                // check assignment: if poll exists, verify assignment
                if (found) {
                    try {
                        const assign = await api.getPollAssignment(found._id || found.id);
                        // if assignment exists and current user not in list, we still let teacher/admin in but students should be blocked
                        setPoll({ ...found, assignment: assign });
                    } catch (e) { }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [pollId]);

    useEffect(() => {
        // Client-side countdown timer for more accurate display
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

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [session?.timeLeft, session?.active]);

    // Poll for active session with connection error handling
    useEffect(() => {
        const tick = async () => {
            if (!poll) return;
            try {
                const s = await api.getPollSession(poll._id || poll.id);
                setSession(s);
                setConnectionError(false);

                // Reset timeout on successful connection
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
        // If session expired and results available, wait then advance
        if (session.timeLeft === 0) {
            // show results for 4s then navigate away or wait for admin to advance
            const t = setTimeout(() => {
                // students will wait for admin to advance; if admin doesn't advance, move to next poll
                advanceToNextPoll();
            }, 4000);
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
            console.error(e);
            addToast(e?.response?.data?.message || 'Failed to record vote', 'error');
            setSelected(null);
        } finally {
            setVoting(false);
        }
    };

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (hasVoted || voting || !session || (clientTimer === 0 || session.active === false)) return;
            const qIndex = session?.currentQuestionIndex ?? 0;
            const question = (poll?.questions || [])[qIndex];
            const optCount = (question?.options || []).length;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selected === null) setSelected(optCount - 1);
                else if (selected > 0) setSelected(selected - 1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (selected === null) setSelected(0);
                else if (selected < optCount - 1) setSelected(selected + 1);
            } else if (e.key === 'Enter' && selected !== null) {
                e.preventDefault();
                handleVote(selected);
            }
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
        if (!polls || polls.length === 0 || !poll) {
            navigate("/student");
            return;
        }
        const idx = polls.findIndex((p) => (p._id || p.id) === (poll._id || poll.id));
        if (idx < 0 || idx + 1 >= polls.length) {
            navigate("/student");
        } else {
            const next = polls[idx + 1];
            navigate(`/poll/${next._id || next.id}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!poll) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-2xl text-center">
                    <h2 className="text-2xl font-bold mb-2">No poll found</h2>
                    <p className="text-slate-400">This poll may not exist or hasn't been created yet.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-start justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            <Card className="w-full max-w-4xl">
                {/* Connection Error Banner */}
                {connectionError && (
                    <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg flex items-center justify-between animate-pulse">
                        <span className="text-red-200 flex items-center gap-2">⚠️ Connection lost. Some updates may be delayed.</span>
                        <button
                            onClick={handleRefreshSession}
                            className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-white transition-colors font-semibold"
                        >
                            Reconnect
                        </button>
                    </div>
                )}

                {/* Header Section */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold mb-2 text-white">{poll.title || `Poll`}</h2>

                    {/* Question Counter & Progress */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-slate-300">
                            Question <span className="font-bold text-blue-400">{(session?.currentQuestionIndex ?? 0) + 1}</span> of <span className="font-bold">{(poll.questions || []).length}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="flex-1 mx-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                style={{ width: `${((session?.currentQuestionIndex ?? 0) + 1) / (poll.questions || []).length * 100}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                            />
                        </div>
                    </div>

                    {/* Timer Section */}
                    {session && session.timeLeft !== null && (
                        <div className="flex items-center gap-2">
                            <div
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: (clientTimer || 0) < 5000 && (clientTimer || 0) > 0 ? '#7f1d1d' : (clientTimer || 0) === 0 ? '#991b1b' : '#1e3a8a',
                                    color: (clientTimer || 0) < 5000 ? '#fca5a5' : '#93c5fd',
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    minWidth: '100px',
                                    textAlign: 'center',
                                    animation: (clientTimer || 0) < 5000 && (clientTimer || 0) > 0 ? 'pulse 1s infinite' : 'none'
                                }}
                            >
                                ⏱ {Math.ceil((clientTimer || 0) / 1000)}s
                            </div>
                            {clientTimer === 0 && (
                                <span className="text-sm font-semibold text-yellow-400 animate-pulse">📊 Results Shown</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Question Text */}
                {(() => {
                    const qIndex = session?.currentQuestionIndex ?? 0;
                    const question = (poll.questions || [])[qIndex];
                    return question && question.questionText ? (
                        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                            <p className="text-lg text-white font-semibold">{question.questionText}</p>
                        </div>
                    ) : null;
                })()}

                {/* Options Section */}
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
                                <div key={i} className="">
                                    <button
                                        onClick={() => handleVote(i)}
                                        disabled={hasVoted || isSessionExpired || voting}
                                        aria-label={`Option ${i + 1}: ${opt}${isSelected ? ' (Selected)' : ''}${isSelected && hasVoted ? ' (Your vote)' : ''}`}
                                        style={{
                                            borderColor: isSelected && !isSessionExpired ? '#22c55e' : '#374151',
                                            backgroundColor: isSelected && !isSessionExpired ? '#14532d' : '#111827',
                                            opacity: isSessionExpired ? 0.75 : voting && isSelected ? 0.7 : 1,
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex justify-between items-center ${isSessionExpired ? 'cursor-default' : 'hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
                                            }`}
                                        onMouseEnter={(e) => {
                                            if (!isSessionExpired && !hasVoted && !voting) {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1f2937';
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = '#4b5563';
                                            } else if (!isSessionExpired && isSelected) {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#166534';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (isSelected && !isSessionExpired) {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#14532d';
                                            } else if (!isSessionExpired) {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111827';
                                            }
                                        }}
                                    >
                                        <div className="flex-1">
                                            <span className="block text-white font-medium">{opt}</span>
                                            {isSelected && !isSessionExpired && !hasVoted && !voting && (
                                                <span className="text-xs text-green-300 mt-1">✓ Selected (Press Enter to submit)</span>
                                            )}
                                            {voting && isSelected && (
                                                <span className="text-xs text-blue-300 mt-1 flex items-center gap-1">
                                                    <span className="inline-block animate-spin">⏳</span> Submitting...
                                                </span>
                                            )}
                                            {isSelected && hasVoted && (
                                                <span className="text-xs text-green-400 mt-1">✓ Your vote</span>
                                            )}
                                        </div>
                                        <span className="text-lg font-bold text-slate-300">{votes}</span>
                                    </button>

                                    {/* Result bar - show only after session expires */}
                                    {isSessionExpired && (
                                        <div className="mt-2 flex items-center gap-2 animate-fadeIn">
                                            <div className="flex-1 h-6 bg-slate-700 rounded-lg overflow-hidden border border-slate-600">
                                                <div
                                                    style={{ width: `${percent}%`, backgroundColor: '#3b82f6' }}
                                                    className="h-full transition-all duration-700 flex items-center justify-end pr-2"
                                                >
                                                    {percent > 10 && <span className="text-xs font-bold text-white">{percent}%</span>}
                                                </div>
                                            </div>
                                            <span className="text-sm font-semibold text-blue-400 w-12 text-right">{percent}%</span>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700 mb-6">
                    <div>
                        <p className="text-sm text-slate-400">Total Votes</p>
                        <p className="text-2xl font-bold text-blue-400">{totalVotes}</p>
                    </div>
                    {hasVoted ? (
                        <div className="text-center">
                            <p className="text-sm text-slate-400">Status</p>
                            <p className="text-lg font-semibold text-green-400">✓ Voted</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm text-slate-400">Your Vote</p>
                            <p className="text-sm font-semibold text-yellow-400">Pending</p>
                        </div>
                    )}
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Participants</p>
                        <p className="text-2xl font-bold text-purple-400">{session?.voters?.length || 0}</p>
                    </div>
                </div>

                {/* Keyboard Hint */}
                {!hasVoted && clientTimer !== 0 && (
                    <div className="text-xs text-slate-500 text-center mb-4 bg-slate-900 p-2 rounded border border-slate-700">
                        💡 Tip: Use ↑↓ arrow keys to navigate options, press Enter to submit
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => navigate('/student')}>Exit Poll</Button>
                </div>
            </Card>
        </div>
    );
};

export default PollTaker;
