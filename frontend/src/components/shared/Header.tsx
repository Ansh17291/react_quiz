import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Roles } from '../../types';
import { Button } from '../ui';
import { TrophyIcon } from '../Icons';

const SunIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
);

const MoonIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
);

export const Header = () => {
    const { currentUser, logout } = useAppContext();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const homePath = currentUser ? `/${currentUser.role.toLowerCase()}` : '/';

    return (
        <header
            className="sticky top-0 z-40 transition-all duration-300"
            style={{
                background: isDark ? '#1c1c1c' : '#ffffff',
                borderBottom: `1px solid ${isDark ? '#2e2e2e' : '#e5e7eb'}`,
                boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                {/* Logo */}
                <div
                    className="flex items-center gap-2.5 cursor-pointer shrink-0"
                    onClick={() => navigate(homePath)}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        iQ
                    </div>
                    <span
                        className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent"
                    >
                        IntelliQuiz AI
                    </span>
                </div>

                {/* Nav links */}
                {currentUser && (
                    <nav className="hidden md:flex items-center gap-1">
                        {[
                            { to: '/leaderboard', label: 'Leaderboard' },
                            ...(currentUser.role === Roles.STUDENT ? [{ to: '/discussions', label: 'Discussions' }] : []),
                            { to: '/classrooms', label: 'Classrooms' },
                            { to: '/resources', label: 'Resources' },
                        ].map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                )}

                {/* Right side */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Points */}
                    {currentUser?.role === Roles.STUDENT && (
                        <div className="hidden sm:flex items-center gap-1 font-bold text-yellow-500 text-sm px-2 py-1 rounded-lg"
                            style={{ background: 'var(--surface-2)' }}>
                            <TrophyIcon className="w-4 h-4" />
                            <span>{currentUser.points}</span>
                        </div>
                    )}

                    {/* User name */}
                    {currentUser && (
                        <Link
                            to={`/${currentUser.role.toLowerCase()}/${currentUser._id || currentUser.id}`}
                            className="hidden sm:inline text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}
                        >
                            {currentUser.name}
                            <span className="ml-1 opacity-60 text-xs">({currentUser.role})</span>
                        </Link>
                    )}

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                            background: 'var(--surface-2)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                        }}
                        aria-label="Toggle theme"
                    >
                        {isDark ? <SunIcon /> : <MoonIcon />}
                    </button>

                    {/* Logout */}
                    {currentUser && (
                        <Button onClick={logout} variant="secondary" className="text-sm px-3 py-1.5 h-9">
                            Logout
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};
