import React, { useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Roles, type Role } from '../types';

import HomePage from '../HomePage';
import LoginPage from '../pages/LoginPage';
import StudentDashboard from '../pages/student/StudentDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import QuizTaker from '../pages/student/QuizTaker';
import QuizResults from '../pages/student/QuizResults';
import LeaderboardPage from '../pages/shared/LeaderboardPage';
import ResourcesPage from '../pages/shared/ResourcesPage';
import StudentListPage from '../pages/admin/StudentListPage';
import StudentProfilePage from '../pages/shared/StudentProfilePage';
import DiscussionListPage from '../pages/shared/DiscussionListPage';
import DiscussionPostPage from '../pages/shared/DiscussionPostPage';

import { Header } from '../components/shared/Header';
import { Chatbot } from '../features/chatbot/Chatbot';
import { LightBulbIcon } from '../components/Icons';
import { Spinner } from '../components/ui';

const AppRouter = () => {
    const { currentUser } = useAppContext();
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);

    const userDashboardPath = useMemo(() => {
        if (!currentUser) return '/';
        switch (currentUser.role) {
            case Roles.ADMIN: return '/admin';
            case Roles.TEACHER: return '/teacher';
            case Roles.STUDENT: return '/student';
            default: return '/';
        }
    }, [currentUser]);

    // A simple check to see if context is ready
    if (useAppContext() === null) {
        return (
            <div className="min-h-screen bg-slate-900 flex justify-center items-center">
                <Spinner />
            </div>
        );
    }
    
    return (
        <HashRouter>
            {currentUser ? (
                <div className="min-h-screen bg-slate-900 text-slate-100">
                    <Header />
                    <main className="p-4 sm:p-6 lg:p-8">
                        <Routes>
                            <Route path="/student" element={<StudentDashboard />} />
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/teacher" element={<TeacherDashboard />} />
                            <Route path="/quiz/:assignmentId" element={<QuizTaker />} />
                            <Route path="/results/:quizId" element={<QuizResults />} />
                            <Route path="/leaderboard" element={<LeaderboardPage />} />
                            <Route path="/leaderboard/:quizId" element={<LeaderboardPage />} />
                            <Route path="/resources" element={<ResourcesPage />} />
                            <Route path="/students" element={<StudentListPage />} />
                            <Route path="/student/:studentId" element={<StudentProfilePage />} />
                            <Route path="/discussions" element={<DiscussionListPage />} />
                            <Route path="/discussions/:postId" element={<DiscussionPostPage />} />
                            <Route path="*" element={<Navigate to={userDashboardPath} />} />
                        </Routes>
                    </main>
                    {currentUser.role === Roles.STUDENT && (
                        <>
                            <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
                            <button
                                onClick={() => setIsChatbotOpen(true)}
                                className="fixed bottom-6 right-6 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                                aria-label="Open AI Assistant"
                            >
                                <LightBulbIcon className="w-8 h-8" />
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<HomePage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            )}
        </HashRouter>
    );
};

export default AppRouter;
