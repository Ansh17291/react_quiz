// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Button } from './components/ui';
// import { BookOpenIcon, ChartBarIcon, LightBulbIcon, UserGroupIcon } from './components/Icons';

// // FIX: Changed component definition to use a props interface and React.FC to resolve typing issues with children props.
// interface AnimatedFeatureCardProps {
//     icon: React.ReactNode;
//     title: string;
//     children: React.ReactNode;
//     delay: number;
// }
// const AnimatedFeatureCard = ({ icon, title, children, delay }: AnimatedFeatureCardProps) => {
//     const [isVisible, setIsVisible] = useState(false);
//     useEffect(() => {
//         const timer = setTimeout(() => setIsVisible(true), delay);
//         return () => clearTimeout(timer);
//     }, [delay]);

//     return (
//         <div className={`bg-slate-800 p-6 rounded-lg text-center transform hover:scale-105 transition-all duration-300 flex flex-col items-center group hover:shadow-2xl hover:shadow-primary-700/20 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
//              <div className="absolute -inset-0.5 bg-linear-to from-primary-600 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
//             <div className="relative bg-slate-800 rounded-lg p-6 w-full h-full flex flex-col items-center">
//                 <div className="shrink-0 flex justify-center mb-4">{icon}</div>
//                 <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
//                 <p className="text-slate-400">{children}</p>
//             </div>
//         </div>
//     );
// };


// const HomePage = () => {
//     const navigate = useNavigate();
//     const [isHeaderVisible, setIsHeaderVisible] = useState(false);

//     useEffect(() => {
//       const timer = setTimeout(() => setIsHeaderVisible(true), 100);
//       return () => clearTimeout(timer);
//     }, []);

//     return (
//         <div className="text-white bg-slate-900">
//             <header className={`absolute top-0 left-0 right-0 p-4 bg-transparent flex justify-between items-center z-10 transition-all duration-500 ${isHeaderVisible ? 'opacity-100' : 'opacity-0 -translate-y-5'}`}>
//                  <h1 className="text-2xl font-bold text-primary-500">IntelliQuiz AI</h1>
//                  <Button onClick={() => navigate('/login')} variant="secondary">Sign In</Button>
//             </header>
            
//             <main>
//                 <section className="relative text-center px-4 py-24 sm:py-32 lg:py-40 overflow-hidden">
//                     <div className="absolute inset-0 animated-gradient z-0"></div>
//                     <div className="relative z-10">
//                         <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100">
//                             The Future of Learning, <span className="text-primary-400">Personalized</span>.
//                         </h2>
//                         <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-300">
//                             IntelliQuiz is an AI-powered platform that transforms studying into a dynamic, personalized experience. Create, take, and analyze quizzes like never before.
//                         </p>
//                         <div className="mt-8">
//                             <Button onClick={() => navigate('/login')} className="text-lg px-8 py-3">Get Started Now</Button>
//                         </div>
//                     </div>
//                 </section>

//                 <section className="py-20 sm:py-24 max-w-5xl mx-auto px-4">
//                      <h3 className="text-3xl font-bold text-center mb-12">Why IntelliQuiz?</h3>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                         <AnimatedFeatureCard delay={200} icon={<LightBulbIcon className="w-12 h-12 text-primary-400" />} title="AI-Generated Quizzes">Admins can instantly create challenging quizzes from any text content, saving hours of manual work.</AnimatedFeatureCard>
//                         <AnimatedFeatureCard delay={300} icon={<ChartBarIcon className="w-12 h-12 text-primary-400" />} title="In-Depth Analysis">Receive immediate, AI-driven feedback on your performance, identifying strengths and weaknesses.</AnimatedFeatureCard>
//                         <AnimatedFeatureCard delay={400} icon={<BookOpenIcon className="w-12 h-12 text-primary-400" />} title="Adaptive Learning">Our system generates follow-up quizzes tailored to your weak spots, helping you master difficult concepts.</AnimatedFeatureCard>
//                         <AnimatedFeatureCard delay={500} icon={<UserGroupIcon className="w-12 h-12 text-primary-400" />} title="Community Discussion">Engage with peers in a dedicated forum. Ask questions, share insights, and learn together.</AnimatedFeatureCard>
//                     </div>
//                 </section>
//             </main>
//              <footer className="text-center p-6 bg-slate-800 text-slate-400">
//                 <p>&copy; {new Date().getFullYear()} IntelliQuiz AI. All rights reserved.</p>
//             </footer>
//         </div>
//     );
// };

// export default HomePage;


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
    const baseStyles = 'px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform';
    const variants = {
        primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white',
        secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
    };
    
    return (
        <button onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </button>
    );
};

const LightBulbIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const ChartBarIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const BookOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const UserGroupIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

interface AnimatedFeatureCardProps {
    icon: React.ReactNode;
    title: string;
    children?: React.ReactNode;
    delay?: number;
}

const AnimatedFeatureCard: React.FC<AnimatedFeatureCardProps> = ({ icon, title, children, delay = 200 }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-800/90 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 group hover:transform hover:scale-[1.02] hover:shadow-2xl">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white group-hover:text-indigo-400 transition-colors duration-300">{title}</h3>
                    <p className="text-slate-400 leading-relaxed">{children}</p>
                </div>
            </div>
        </div>
    );
};

const FloatingOrb = ({ delay, duration, className }) => (
    <div 
        className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
        style={{
            animation: `float ${duration}s ease-in-out ${delay}s infinite`
        }}
    />
);

const HomePage = () => {
    const [isHeaderVisible, setIsHeaderVisible] = useState(false);
    const [scrollY, setScrollY] = useState(0);
    const navigate = useNavigate();
    useEffect(() => {
        const timer = setTimeout(() => setIsHeaderVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="text-white bg-slate-950 overflow-hidden">
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animated-gradient {
                    background: linear-gradient(-45deg, #1e293b, #0f172a, #1e1b4b, #312e81);
                    background-size: 400% 400%;
                    animation: gradient 15s ease infinite;
                }
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                .shimmer {
                    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
                    background-size: 1000px 100%;
                    animation: shimmer 3s infinite;
                }
            `}</style>

            <header 
                className={`fixed top-0 left-0 right-0 p-6 z-50 transition-all duration-500 ${
                    scrollY > 50 ? 'bg-slate-900/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
                } ${isHeaderVisible ? 'opacity-100' : 'opacity-0 -translate-y-5'}`}
            >
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">
                            iQ
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            IntelliQuiz AI
                        </h1>
                    </div>
                    <Button 
                        onClick={() => navigate('/login')} 
                        variant="secondary"
                        className="hover:scale-105 transition-transform duration-200"
                    >
                        Sign In
                    </Button>
                </div>
            </header>
            
            <main>
                <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
                    <div className="absolute inset-0 animated-gradient"></div>
                    
                    <FloatingOrb delay={0} duration={8} className="w-96 h-96 bg-indigo-500 top-1/4 left-1/4" />
                    <FloatingOrb delay={2} duration={10} className="w-80 h-80 bg-purple-500 bottom-1/4 right-1/4" />
                    <FloatingOrb delay={4} duration={12} className="w-72 h-72 bg-pink-500 top-1/2 right-1/3" />
                    
                    <div className="relative z-10 text-center max-w-5xl mx-auto py-20">
                        <div className="inline-block mb-6 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-sm font-medium backdrop-blur-sm">
                            ✨ Powered by Advanced AI
                        </div>
                        
                        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
                            The Future of Learning,
                            <br />
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                                Personalized
                            </span>
                            <span className="text-indigo-400">.</span>
                        </h2>
                        
                        <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-300 leading-relaxed">
                            Transform studying into a dynamic, personalized experience. Create, take, and analyze quizzes with the power of artificial intelligence.
                        </p>
                        
                        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Button 
                                onClick={() => navigate('/login')} 
                                className="text-lg px-10 py-4 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/70 hover:scale-105 transition-all duration-300"
                            >
                                Get Started Free →
                            </Button>
                            <Button 
                                onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                                variant="secondary"
                                className="text-lg px-10 py-4 hover:scale-105 transition-all duration-300"
                            >
                                Learn More
                            </Button>
                        </div>

                        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
                            <div>
                                <div className="text-4xl font-bold text-white mb-2">10K+</div>
                                <div className="text-slate-400 text-sm">Active Users</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-white mb-2">50K+</div>
                                <div className="text-slate-400 text-sm">Quizzes Created</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-white mb-2">95%</div>
                                <div className="text-slate-400 text-sm">Satisfaction Rate</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </section>

                <section className="py-24 sm:py-32 bg-slate-900 relative">
                    <div className="absolute inset-0 shimmer"></div>
                    <div className="max-w-6xl mx-auto px-4 relative z-10">
                        <div className="text-center mb-16">
                            <h3 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                Why Choose IntelliQuiz?
                            </h3>
                            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                                Experience the next generation of personalized learning with cutting-edge AI technology
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <AnimatedFeatureCard 
                                delay={200} 
                                icon={<LightBulbIcon className="w-16 h-16 text-indigo-400" />} 
                                title="AI-Generated Quizzes"
                            >
                                Instantly create challenging quizzes from any text content. Save hours of manual work with intelligent question generation.
                            </AnimatedFeatureCard>
                            
                            <AnimatedFeatureCard 
                                delay={300} 
                                icon={<ChartBarIcon className="w-16 h-16 text-purple-400" />} 
                                title="In-Depth Analysis"
                            >
                                Get immediate, AI-driven feedback on your performance. Identify strengths and weaknesses with detailed analytics.
                            </AnimatedFeatureCard>
                            
                            <AnimatedFeatureCard 
                                delay={400} 
                                icon={<BookOpenIcon className="w-16 h-16 text-pink-400" />} 
                                title="Adaptive Learning"
                            >
                                Our system generates personalized follow-up quizzes targeting your weak spots, helping you master difficult concepts faster.
                            </AnimatedFeatureCard>
                            
                            <AnimatedFeatureCard 
                                delay={500} 
                                icon={<UserGroupIcon className="w-16 h-16 text-cyan-400" />} 
                                title="Community Discussion"
                            >
                                Engage with peers in our dedicated forum. Ask questions, share insights, and learn together in a collaborative environment.
                            </AnimatedFeatureCard>
                        </div>
                    </div>
                </section>

                <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <h3 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
                            Ready to Transform Your Learning?
                        </h3>
                        <p className="text-xl text-slate-300 mb-10">
                            Join thousands of students already mastering their subjects with IntelliQuiz AI
                        </p>
                        <Button 
                            onClick={() => alert('Starting your journey!')} 
                            className="text-xl px-12 py-5 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/70 hover:scale-110 transition-all duration-300"
                        >
                            Start Learning Now
                        </Button>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
                </section>
            </main>
            
            <footer className="text-center py-8 bg-slate-950 border-t border-slate-800">
                <p className="text-slate-500">
                    &copy; {new Date().getFullYear()} IntelliQuiz AI. All rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default HomePage;