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

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useTheme } from "./context/ThemeContext";

const socket = io();

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

const Button = ({ children, onClick, variant = "primary", className = "" }) => {
  const base = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.03] active:scale-95";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/30",
    secondary: "bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const LightBulbIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ChartBarIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BookOpenIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const UserGroupIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ClassroomIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const AcademicCapIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
  </svg>
);

interface AnimatedFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  delay?: number;
}

const AnimatedFeatureCard: React.FC<AnimatedFeatureCardProps> = ({
  icon,
  title,
  children,
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`relative transition-all duration-700 group ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
    >
      <div
        className="p-8 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl theme-transition"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            {icon}
          </div>
          <h3 className="text-xl font-bold mb-3 transition-colors duration-300" style={{ color: 'var(--text)' }}>
            {title}
          </h3>
          <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>{children}</p>
        </div>
      </div>
    </div>
  );
};


const FloatingOrb = ({ delay, duration, className }) => (
  <div
    className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
    style={{
      animation: `float ${duration}s ease-in-out ${delay}s infinite`,
    }}
  />
);

const HomePage = () => {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => setIsHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    socket.emit("hi", "Hellooooo");
  }, []);

  return (
    <div className="overflow-hidden theme-transition" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isHeaderVisible ? "opacity-100" : "opacity-0 -translate-y-5"}`}
        style={scrollY > 50 ? { background: 'var(--surface)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-sm)' } : { background: 'transparent' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md">
              iQ
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-500 to-indigo-400 bg-clip-text text-transparent">
              IntelliQuiz AI
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(109,40,217,0.1)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(109,40,217,0.25)'}`, color: isDark ? 'white' : '#6d28d9' }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <Button onClick={() => navigate("/login")} variant="secondary" className="px-4 py-2 text-sm">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
          {/* Background: animated dark in dark mode, soft gradient in light mode */}
          <div
            className="absolute inset-0"
            style={isDark ? {} : { background: 'linear-gradient(135deg, #ede9fe 0%, #f5f3ff 40%, #ddd6fe 100%)' }}
          >
            {isDark && <div className="absolute inset-0 animated-gradient" />}
          </div>

          <FloatingOrb delay={0} duration={8} className={`w-96 h-96 top-1/4 left-1/4 ${isDark ? 'bg-violet-600' : 'bg-violet-300'}`} />
          <FloatingOrb delay={2} duration={10} className={`w-80 h-80 bottom-1/4 right-1/4 ${isDark ? 'bg-indigo-600' : 'bg-indigo-200'}`} />
          <FloatingOrb delay={4} duration={12} className={`w-72 h-72 top-1/2 right-1/3 ${isDark ? 'bg-purple-600' : 'bg-purple-200'}`} />

          <div className="relative z-10 text-center max-w-5xl mx-auto py-20">
            <div
              className="inline-block mb-6 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border"
              style={isDark
                ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' }
                : { background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.2)', color: '#7c3aed' }
              }
            >
              ✨ Powered by Advanced AI
            </div>

            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight" style={{ color: 'var(--text)' }}>
              The Future of Learning,
              <br />
              <span className="bg-gradient-to-r from-violet-500 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                Personalized
              </span>
              <span style={{ color: 'var(--accent)' }}>.</span>
            </h2>

            <p className="mt-6 max-w-2xl mx-auto text-xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Transform studying into a dynamic, personalized experience.
              Create, take, and analyze quizzes with the power of artificial
              intelligence.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => navigate("/login")}
                className="text-lg px-10 py-4 shadow-2xl shadow-violet-500/50 hover:shadow-violet-500/70 hover:scale-105 transition-all duration-300"
              >
                Get Started Free →
              </Button>
              <Button
                onClick={() =>
                  window.scrollTo({
                    top: window.innerHeight,
                    behavior: "smooth",
                  })
                }
                variant="secondary"
                className="text-lg px-10 py-4 hover:scale-105 transition-all duration-300"
              >
                Learn More
              </Button>
            </div>


          </div>

          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg
              className="w-6 h-6 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </section>

        <section className="py-24 sm:py-32 relative theme-transition" style={{ background: 'var(--surface)' }}>
          <div className="absolute inset-0 shimmer"></div>
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <h3 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                Why Choose IntelliQuiz?
              </h3>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
                Experience the next generation of personalized learning with
                cutting-edge AI technology
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              <AnimatedFeatureCard
                delay={200}
                icon={<LightBulbIcon className="w-16 h-16" style={{ color: 'var(--accent)' }} />}
                title="AI-Generated Quizzes"
              >
                Instantly create challenging quizzes from any text content. Save
                hours of manual work with intelligent question generation.
              </AnimatedFeatureCard>

              <AnimatedFeatureCard
                delay={300}
                icon={<ChartBarIcon className="w-16 h-16" style={{ color: 'var(--accent)' }} />}
                title="In-Depth Analysis"
              >
                Get immediate, AI-driven feedback on your performance. Identify
                strengths and weaknesses with detailed analytics.
              </AnimatedFeatureCard>

              <AnimatedFeatureCard
                delay={400}
                icon={<ClassroomIcon className="w-16 h-16" style={{ color: 'var(--accent)' }} />}
                title="Virtual Classrooms"
              >
                Teachers create classrooms, share a unique join code, and manage
                students. Students join instantly and access shared quizzes and resources.
              </AnimatedFeatureCard>

              <AnimatedFeatureCard
                delay={500}
                icon={<BookOpenIcon className="w-16 h-16" style={{ color: 'var(--accent)' }} />}
                title="Adaptive Learning"
              >
                Our system generates personalized follow-up quizzes targeting
                your weak spots, helping you master difficult concepts faster.
              </AnimatedFeatureCard>

              <AnimatedFeatureCard
                delay={600}
                icon={<UserGroupIcon className="w-16 h-16" style={{ color: 'var(--accent)' }} />}
                title="Community Discussion"
              >
                Engage with peers in our dedicated forum. Ask questions, share
                insights, and learn together in a collaborative environment.
              </AnimatedFeatureCard>

              <AnimatedFeatureCard
                delay={700}
                icon={<AcademicCapIcon className="w-16 h-16" style={{ color: 'var(--accent)' }} />}
                title="Leaderboards & Polls"
              >
                Friendly competition drives engagement. Track rankings, participate
                in live polls, and celebrate top performers in your class.
              </AnimatedFeatureCard>
            </div>
          </div>
        </section>

        {/* Classroom Showcase Section */}
        <section className="py-24 sm:py-32 relative overflow-hidden theme-transition" style={{ background: 'var(--surface-2)' }}>
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -translate-y-1/2"></div>
            <div className="absolute top-1/2 right-0 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl -translate-y-1/2"></div>
          </div>
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full text-emerald-500 text-sm font-medium border border-emerald-500/20"
                style={{ background: 'var(--accent-light)' }}>
                <ClassroomIcon className="w-4 h-4" /> Virtual Classrooms
              </div>
              <h3 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                Bring Your Classroom{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Online</span>
              </h3>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
                Create a virtual classroom in seconds. Share a join code and your students are in — no email setup, no friction.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Teacher Flow */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <AcademicCapIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>For Teachers</h4>
                </div>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Create a Classroom", desc: "Set up a class with a name, description, and invite students directly.", color: "from-emerald-500 to-teal-500" },
                    { step: "2", title: "Get a Unique Class Code", desc: "Each classroom gets a 6-character code to share with your students.", color: "from-teal-500 to-cyan-500" },
                    { step: "3", title: "Assign Quizzes & Resources", desc: "Push quizzes, polls, and materials directly to your classroom members.", color: "from-cyan-500 to-indigo-500" },
                  ].map(({ step, title, desc, color }) => (
                    <div key={step} className="flex gap-4 group">
                      <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white text-sm shadow-lg group-hover:scale-110 transition-transform`}>
                        {step}
                      </div>
                      <div className="rounded-xl p-4 flex-1 transition-colors theme-transition"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Flow */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>For Students</h4>
                </div>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Enter Your Join Code", desc: "Type the 6-character code from your teacher to instantly join the class.", color: "from-indigo-500 to-purple-500" },
                    { step: "2", title: "Access Shared Content", desc: "Get immediate access to quizzes, discussions, and resources assigned to you.", color: "from-purple-500 to-pink-500" },
                    { step: "3", title: "Track Your Progress", desc: "See your performance on the leaderboard and compete with classmates.", color: "from-pink-500 to-rose-500" },
                  ].map(({ step, title, desc, color }) => (
                    <div key={step} className="flex gap-4 group">
                      <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white text-sm shadow-lg group-hover:scale-110 transition-transform`}>
                        {step}
                      </div>
                      <div className="rounded-xl p-4 flex-1 transition-colors theme-transition"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden theme-transition" style={{ background: 'var(--surface)' }}>
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h3 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--text)' }}>
              Ready to Transform Your Learning?
            </h3>
            <p className="text-xl mb-10" style={{ color: 'var(--text-muted)' }}>
              Join thousands of students already mastering their subjects with
              IntelliQuiz AI
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="text-xl px-12 py-5 shadow-2xl shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-110 transition-all duration-300"
            >
              Start Learning Now
            </Button>
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(124,58,237,0.07) 0%, transparent 70%)' }}></div>
        </section>
      </main>

      <footer className="text-center py-8 theme-transition" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <p>
          &copy; {new Date().getFullYear()} IntelliQuiz AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
