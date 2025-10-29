import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { AnimatedWrapper, StaggeredList } from '../../components/shared/AnimatedComponents';
import { Card, Tabs } from '../../components/ui';
import { TrophyIcon } from '../../components/Icons';

const LeaderboardPage = () => {
    const { quizId } = useParams<{ quizId?: string }>();
    const { users, quizzes, results } = useAppContext();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(quizId ? 'By Quiz' : 'Overall');
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(quizId || null);

    const students = users.filter(u => u.role === 'STUDENT');
    const rankBadges = ['🥇', '🥈', '🥉'];

    const overallLeaderboard = useMemo(() => {
        return [...students].sort((a, b) => b.points - a.points);
    }, [students]);

    const quizLeaderboard = useMemo(() => {
        if (!selectedQuizId) return [];
        return results
            .filter(r => r.quizId === selectedQuizId)
            .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken) // Sort by score, then time
            .map(result => ({
                user: users.find(u => u.id === result.userId),
                result
            }));
    }, [results, users, selectedQuizId]);
    
    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

    const handleQuizSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newQuizId = e.target.value;
        setSelectedQuizId(newQuizId);
        setActiveTab('By Quiz');
        navigate(newQuizId ? `/leaderboard/${newQuizId}`: '/leaderboard');
    }

    return (
        <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">Leaderboards</h2>
            <Card>
                <Tabs tabs={['Overall', 'By Quiz']} activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="mt-6">
                    {activeTab === 'Overall' && (
                        <div>
                            <h3 className="text-xl font-semibold mb-4">Overall Student Rankings (by Points)</h3>
                            <StaggeredList className="space-y-2">
                               {overallLeaderboard.map((student, index) => (
                                   <div key={student.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                                       <span className="font-medium text-lg flex items-center gap-3">
                                            <span className={`text-xl w-6 text-center ${index < 3 ? '' : 'text-slate-400'}`}>{rankBadges[index] || index + 1}</span>
                                           {student.name}
                                       </span>
                                       <span className="font-bold text-yellow-400 text-lg flex items-center gap-1"><TrophyIcon className="w-5 h-5"/>{student.points}</span>
                                   </div>
                               ))} 
                            </StaggeredList>
                        </div>
                    )}
                    {activeTab === 'By Quiz' && (
                        <div>
                            <h3 className="text-xl font-semibold mb-4">Quiz-Specific Rankings</h3>
                            <select onChange={handleQuizSelection} value={selectedQuizId || ''} className="w-full p-2 mb-4 border rounded-md bg-slate-700 border-slate-600">
                                <option value="">-- Select a Quiz --</option>
                                {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                            </select>

                            {selectedQuizId && (
                                <>
                                    <h4 className="text-lg font-bold mb-2">Results for: {selectedQuiz?.title}</h4>
                                     {quizLeaderboard.length > 0 ? (
                                        <StaggeredList className="space-y-2">
                                        {quizLeaderboard.map(({ user, result }, index) => (
                                           <div key={user?.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                                               <span className="font-medium flex items-center gap-3">
                                                    <span className={`text-xl w-6 text-center ${index < 3 ? '' : 'text-slate-400'}`}>{rankBadges[index] || index + 1}</span>
                                                    {user?.name || 'Unknown Student'}
                                               </span>
                                               <div className="flex items-center gap-4">
                                                   <span className="text-sm text-slate-400">{Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s</span>
                                                   <span className="font-bold text-primary-400">{result.score}/100</span>
                                               </div>
                                           </div>
                                       ))}
                                        </StaggeredList>
                                     ) : <p className="text-slate-400 text-center py-4">No results yet for this quiz.</p>} 
                                </>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </AnimatedWrapper>
    );
}

export default LeaderboardPage;
