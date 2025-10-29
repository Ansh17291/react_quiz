import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { StatCard } from '../../features/dashboard/StatCard';
import { ContributionHeatmap } from '../../features/dashboard/ContributionHeatmap';
import { AnimatedWrapper, StaggeredList } from '../../components/shared/AnimatedComponents';
import { Button, Card } from '../../components/ui';
import { CalendarIcon, UserGroupIcon, TrophyIcon, ChartBarIcon, BookOpenIcon } from '../../components/Icons';

const StudentDashboard = () => {
    const { currentUser, quizzes, results, assignments, users } = useAppContext();
    const navigate = useNavigate();
    
    const studentAssignments = assignments.filter(a => a.studentIds.includes(currentUser!.id));
    const studentResults = results.filter(r => r.userId === currentUser?.id);
    const overallRank = [...users.filter(u => u.role === 'STUDENT')].sort((a,b) => b.points - a.points).findIndex(u => u.id === currentUser!.id) + 1;
    const avgScore = studentResults.length > 0 ? Math.round(studentResults.reduce((acc, r) => acc + r.score, 0) / studentResults.length) : 'N/A';

    return (
        <AnimatedWrapper className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold">Welcome back, {currentUser?.name}!</h2>
                <p className="text-slate-400">Ready to conquer some quizzes today?</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <h3 className="text-xl font-semibold mb-4">Assigned Quizzes</h3>
                         {studentAssignments.length > 0 ? (
                            <StaggeredList className="space-y-3">
                                {studentAssignments.map(assignment => {
                                    const quiz = quizzes.find(q => q.id === assignment.quizId);
                                    const isTaken = studentResults.some(r => r.quizId === quiz?.id);
                                    const isExpired = new Date(assignment.deadline) < new Date();
                                    if (!quiz) return null;

                                    return (
                                        <div key={assignment.id} className="p-4 bg-slate-700/50 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors">
                                            <div>
                                                <p className="font-semibold text-lg">{quiz.title} {assignment.isLive && <span className="text-xs font-medium text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full ml-2">LIVE</span>}</p>
                                                <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1"><CalendarIcon className="w-4 h-4" /> Deadline: {new Date(assignment.deadline).toLocaleDateString()}</p>
                                            </div>
                                            {isTaken ? (
                                                <Button onClick={() => navigate(`/results/${quiz.id}`)} variant="secondary">Review</Button>
                                            ) : isExpired ? (
                                                <span className="px-3 py-1 text-xs font-semibold text-red-200 bg-red-800 rounded-full">Expired</span>
                                            ) : (
                                                <Button onClick={() => navigate(`/quiz/${assignment.id}`)}>{assignment.isLive ? 'Join Live Quiz' : 'Start Quiz'}</Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </StaggeredList>
                         ) : (
                            <p className="text-slate-400 text-center py-4">No quizzes assigned yet. Check back later!</p>
                         )}
                    </Card>
                    <Card>
                        <h3 className="text-xl font-semibold mb-4">Your Activity</h3>
                        <ContributionHeatmap results={studentResults} />
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h3 className="text-xl font-semibold mb-4 text-center">Your Stats</h3>
                        <div className="space-y-4">
                            <StatCard label="Total Points" value={currentUser!.points} icon={<TrophyIcon />} />
                            <StatCard label="Overall Rank" value={`#${overallRank}`} icon={<UserGroupIcon />} />
                            <StatCard label="Average Score" value={avgScore === 'N/A' ? 'N/A' : `${avgScore}%`} icon={<ChartBarIcon />} />
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => navigate(`/student/${currentUser!.id}`)} variant="secondary" className="w-full"><UserGroupIcon className="w-5 h-5"/> My Profile</Button>
                            <Button onClick={() => navigate('/discussions')} variant="secondary" className="w-full"><UserGroupIcon className="w-5 h-5"/> Discussions</Button>
                            <Button onClick={() => navigate('/resources')} variant="secondary" className="w-full"><BookOpenIcon className="w-5 h-5" /> Resources</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </AnimatedWrapper>
    );
};

export default StudentDashboard;
