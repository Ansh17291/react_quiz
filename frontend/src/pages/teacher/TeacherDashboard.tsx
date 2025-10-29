import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { AnimatedWrapper, StaggeredList } from '../../components/shared/AnimatedComponents';
import { Card } from '../../components/ui';
import { TrophyIcon } from '../../components/Icons';

const TeacherDashboard = () => {
    const { users, results } = useAppContext();
    const navigate = useNavigate();
    const students = users.filter(u => u.role === 'STUDENT');

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
            <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
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
        </AnimatedWrapper>
    );
};

export default TeacherDashboard;
