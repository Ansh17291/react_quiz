import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Roles, type Role } from "../types";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../components/ui";
import { Button } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";
import { BASE } from "../services/api";

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);
const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const inputClass = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20`;

const LoginPage = () => {
  const { login } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isDark, toggleTheme } = useTheme();

  const [activeRole, setActiveRole] = useState<Role>(Roles.STUDENT);
  const [studentMode, setStudentMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => { setName(""); setPassword(""); };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await axios.post(`${BASE}/api/user/student-login`, { name, password });
      if (user.data.user) {
        login(user.data);
        addToast(`Welcome back, ${user.data.user.name}!`, "success");
        navigate("/student");
      } else {
        addToast("Invalid credentials or user does not exist.", "error");
      }
    } finally { setIsLoading(false); }
  };

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { addToast("Please enter a name.", "error"); return; }
    setIsLoading(true);
    try {
      const user = await axios.post(`${BASE}/api/user/signup`, { username: name, password });
      if (user.data?.message === "User exists") {
        addToast("Another user exists with the same username", "error");
        return;
      }
      addToast(`Welcome, ${name}! Your account has been created.`, "success");
      login(user.data);
      navigate("/student");
    } finally { setIsLoading(false); }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await axios.post(`${BASE}/api/user/teacher-login`, { name, password });
      if (user.data.user) {
        login(user.data);
        addToast(`Welcome, ${user.data.user.name}!`, "success");
        navigate(`/${user.data.user.name}`);
      } else {
        addToast("Invalid credentials.", "error");
      }
    } finally { setIsLoading(false); }
  };

  const renderStudentForm = () => (
    <div>
      {/* Login / Signup toggle */}
      <div className="flex rounded-xl overflow-hidden p-1 gap-1 mb-6" style={{ background: "var(--surface-2)" }}>
        {(["login", "signup"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => { setStudentMode(mode); resetForm(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${studentMode === mode
              ? "text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            style={studentMode === mode ? { background: "var(--accent)" } : {}}
          >
            {mode}
          </button>
        ))}
      </div>

      <form onSubmit={studentMode === "login" ? handleStudentLogin : handleStudentSignUp} className="space-y-4">
        <div>
          <label className="block mb-1.5 text-sm font-medium" style={{ color: "var(--text-muted)" }}>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required className={inputClass} />
        </div>
        <div>
          <label className="block mb-1.5 text-sm font-medium" style={{ color: "var(--text-muted)" }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={inputClass} />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full py-3 text-base font-semibold">
          {isLoading ? "Please wait..." : studentMode === "login" ? "Sign In →" : "Create Account →"}
        </Button>

      </form>
    </div>
  );

  const renderStaffForm = () => (
    <form onSubmit={handleStaffLogin} className="space-y-4">
      <div>
        <label className="block mb-1.5 text-sm font-medium" style={{ color: "var(--text-muted)" }}>Username</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required className={inputClass} />
      </div>
      <div>
        <label className="block mb-1.5 text-sm font-medium" style={{ color: "var(--text-muted)" }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoFocus className={inputClass} />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full py-3 text-base font-semibold">
        {isLoading ? "Please wait..." : "Sign In →"}
      </Button>

    </form>
  );

  return (
    <div className="min-h-screen bg-grid flex flex-col theme-transition" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <header className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">iQ</div>
          <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">IntelliQuiz AI</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border"
          style={{ background: "var(--accent-light)", borderColor: "var(--border-2)", color: "var(--accent)" }}>
          ✦ Sign in to continue
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: "var(--text)" }}>Welcome back</h1>
        <p className="mb-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>Choose your role to access your dashboard</p>

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-[var(--shadow-lg)] theme-transition"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {/* Role tabs */}
          <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
            {(["STUDENT", "TEACHER", "ADMIN"] as const).map((role) => (
              <button
                key={role}
                onClick={() => { setActiveRole(role as Role); resetForm(); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-200 ${activeRole === role ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                style={{
                  borderBottom: activeRole === role ? "2px solid var(--accent)" : "2px solid transparent",
                  background: activeRole === role ? "var(--accent-light)" : "transparent",
                }}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="p-6">
            {activeRole === Roles.STUDENT && renderStudentForm()}
            {activeRole === Roles.TEACHER && renderStaffForm()}
            {activeRole === Roles.ADMIN && renderStaffForm()}
          </div>
        </div>

        <p className="mt-6 text-xs" style={{ color: "var(--text-subtle)" }}>
          © {new Date().getFullYear()} IntelliQuiz AI
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
