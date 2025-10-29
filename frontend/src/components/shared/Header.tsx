// import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Roles } from '../../types';
import { Button } from '../ui';
import { TrophyIcon } from '../Icons';

export const Header = () => {
    const { currentUser, logout } = useAppContext();
    const navigate = useNavigate();
    const homePath = currentUser ? `/${currentUser.role.toLowerCase()}` : '/';
    
    return (
        <header className="bg-slate-800/80 backdrop-blur-sm shadow-md p-4 flex justify-between items-center sticky top-0 z-40 transition-all duration-300">
            <h1 onClick={() => navigate(homePath)} className="text-2xl font-bold text-primary-500 cursor-pointer hover:text-primary-400 transition-colors">IntelliQuiz AI</h1>
            {currentUser && (
                <div className="flex items-center gap-4">
                    <nav className="hidden md:flex items-center gap-4">
                        <Link to="/leaderboard" className="font-semibold text-slate-300 hover:text-primary-400 transition-colors">Leaderboard</Link>
                         {currentUser.role === Roles.STUDENT && <Link to="/discussions" className="font-semibold text-slate-300 hover:text-primary-400 transition-colors">Discussions</Link>}
                        <Link to="/resources" className="font-semibold text-slate-300 hover:text-primary-400 transition-colors">Resources</Link>
                    </nav>
                    <div className="flex items-center gap-4 pl-4 border-l border-slate-700">
                        {currentUser.role === Roles.STUDENT && (
                            <div className="flex items-center gap-1 font-bold text-yellow-400">
                                <TrophyIcon className="w-5 h-5" />
                                <span>{currentUser.points}</span>
                            </div>
                        )}
                        <span className="font-semibold hidden sm:inline">{currentUser.name} ({currentUser.role})</span>
                        <Button onClick={logout} variant="secondary">Logout</Button>
                    </div>
                </div>
            )}
        </header>
    );
};
