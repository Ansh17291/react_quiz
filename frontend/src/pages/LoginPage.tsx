import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Roles, type Role } from '../types';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/ui';
import { Button, Card } from '../components/ui';

const LoginPage = () => {
  const { login, users, addUser } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeRole, setActiveRole] = useState<Role>(Roles.STUDENT);
  const [studentMode, setStudentMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const resetForm = () => {
    setName('');
    setPassword('');
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(
      (u) =>
        u.role === Roles.STUDENT &&
        u.name.toLowerCase() === name.toLowerCase() &&
        password === 'student'
    );
    if (foundUser) {
      login(foundUser);
      addToast(`Welcome back, ${foundUser.name}!`, 'success');
      navigate('/student');
    } else {
      addToast('Invalid credentials or user does not exist.', 'error');
    }
  };

  const handleStudentSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Please enter a name.', 'error');
      return;
    }
    if (password !== 'student') {
      addToast('For this demo, password must be "student".', 'info');
      return;
    }
    const userExists = users.some(
      (u) => u.name.toLowerCase() === name.toLowerCase()
    );
    if (userExists) {
      addToast('A user with this name already exists. Please log in.', 'error');
      return;
    }

    const newUser = addUser({ name, role: Roles.STUDENT });
    login(newUser);
    addToast(`Welcome, ${name}! Your account has been created.`, 'success');
    navigate('/student');
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let foundUser: any;
    const username = activeRole.toLowerCase();

    if (password === username) {
      foundUser = users.find((u) => u.role === activeRole);
    }

    if (foundUser) {
      login(foundUser);
      addToast(`Welcome, ${foundUser.name}!`, 'success');
      navigate(`/${username}`);
    } else {
      addToast('Invalid credentials.', 'error');
    }
  };

  const renderStudentForm = () => (
    <div className="transition-all duration-300">
      <div className="flex border-b border-slate-700 bg-slate-800/60 backdrop-blur-md rounded-t-md overflow-hidden">
        {['login', 'signup'].map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setStudentMode(mode as 'login' | 'signup');
              resetForm();
            }}
            className={`flex-1 p-3 font-semibold uppercase tracking-wide transition-all duration-300 ${
              studentMode === mode
                ? 'bg-primary-600 text-white shadow-inner'
                : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <form
        onSubmit={studentMode === 'login' ? handleStudentLogin : handleStudentSignUp}
        className="space-y-5 p-6"
      >
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-300">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-400 outline-none transition-all placeholder:text-slate-500"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-400 outline-none transition-all placeholder:text-slate-500"
          />
        </div>
        <Button
          type="submit"
          className="w-full py-3 text-lg font-bold tracking-wide bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-indigo-500 hover:to-primary-500 transition-all duration-300"
        >
          {studentMode === 'login' ? 'Log In' : 'Sign Up'}
        </Button>
        <p className="mt-3 text-xs text-slate-400 text-center">
          Hint: Use any name and password <code>student</code>.<br /> Existing
          students: Alice, Bob, Charlie.
        </p>
      </form>
    </div>
  );

  const renderStaffForm = (role: 'ADMIN' | 'TEACHER') => (
    <form
      onSubmit={handleStaffLogin}
      className="space-y-5 p-6 transition-all duration-300"
    >
      <div>
        <label className="block mb-1 text-sm font-medium text-slate-300">
          Username
        </label>
        <input
          type="text"
          value={role.toLowerCase()}
          readOnly
          className="w-full p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 cursor-not-allowed"
        />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium text-slate-300">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
          autoFocus
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-400 outline-none transition-all placeholder:text-slate-500"
        />
      </div>
      <Button
        type="submit"
        className="w-full py-3 text-lg font-bold bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-indigo-500 hover:to-primary-500 transition-all duration-300"
      >
        Log In
      </Button>
      <p className="mt-3 text-xs text-slate-400 text-center">
        Hint: password is <code>{role.toLowerCase()}</code>
      </p>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <Link
        to="/"
        className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-indigo-400 mb-8 hover:scale-105 transition-transform"
      >
        IntelliQuiz AI
      </Link>

      <Card className="w-full max-w-md backdrop-blur-md bg-slate-800/50 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 hover:border-primary-500 hover:shadow-primary-500/20">
        <div className="flex bg-slate-900/70 border-b border-slate-700">
          {['STUDENT', 'TEACHER', 'ADMIN'].map((role) => (
            <button
              key={role}
              onClick={() => {
                setActiveRole(role as Role);
                resetForm();
              }}
              className={`flex-1 py-4 font-bold transition-all duration-300 ${
                activeRole === role
                  ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {activeRole === Roles.STUDENT && renderStudentForm()}
        {activeRole === Roles.TEACHER && renderStaffForm(Roles.TEACHER)}
        {activeRole === Roles.ADMIN && renderStaffForm(Roles.ADMIN)}
      </Card>
    </div>
  );
};

export default LoginPage;
