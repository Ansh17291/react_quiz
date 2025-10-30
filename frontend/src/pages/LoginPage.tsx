import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Roles, type Role } from "../types";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../components/ui";
import { Button, Card } from "../components/ui";
import axios from "axios";
import { BASE } from "../services/api";

const LoginPage = () => {
  const { login } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeRole, setActiveRole] = useState<Role>(Roles.STUDENT);
  const [studentMode, setStudentMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const resetForm = () => {
    setName("");
    setPassword("");
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = await axios.post(`${BASE}/api/user/student-login`, {
      name,
      password,
    });

    if (user.data.user) {
      login(user.data);
      addToast(`Welcome back, ${user.data.user.name}!`, "success");
      navigate("/student");
    } else {
      addToast("Invalid credentials or user does not exist.", "error");
    }
  };

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast("Please enter a name.", "error");
      return;
    }

    const user = await axios.post(`${BASE}/api/user/signup`, {
      username: name,
      password: password,
    });

    console.log(user.data);

    if (user.data?.message === "User exists") {
      addToast("Another user exists with the same username", "error");
      return;
    }

    addToast(`Welcome, ${name}! Your account has been created.`, "success");
    login(user.data);
    navigate("/student");
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = await axios.post(`${BASE}/api/user/teacher-login`, {
      name,
      password,
    });

    if (user.data.user) {
      login(user.data);
      addToast(`Welcome, ${user.data.user.name}!`, "success");
      navigate(`/${user.data.user.name}`);
    } else {
      addToast("Invalid credentials.", "error");
    }
  };

  const renderStudentForm = () => (
    <div className="transition-all duration-300">
      <div className="flex border-b border-slate-700 bg-slate-800/60 backdrop-blur-md rounded-t-md overflow-hidden">
        {["login", "signup"].map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setStudentMode(mode as "login" | "signup");
              resetForm();
            }}
            className={`flex-1 p-3 font-semibold uppercase tracking-wide transition-all duration-300 ${
              studentMode === mode
                ? "bg-primary-600 text-white shadow-inner"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <form
        onSubmit={
          studentMode === "login" ? handleStudentLogin : handleStudentSignUp
        }
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
          {studentMode === "login" ? "Log In" : "Sign Up"}
        </Button>
        <p className="mt-3 text-xs text-slate-400 text-center">
          Hint: Use any name and password <code>student</code>.<br /> Existing
          students: Alice, Bob, Charlie.
        </p>
      </form>
    </div>
  );

  const renderStaffForm = (role: "ADMIN" | "TEACHER") => (
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
          value={name}
          placeholder="Enter your name"
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-400"
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
          {["STUDENT", "TEACHER", "ADMIN"].map((role) => (
            <button
              key={role}
              onClick={() => {
                setActiveRole(role as Role);
                resetForm();
              }}
              className={`flex-1 py-4 font-bold transition-all duration-300 ${
                activeRole === role
                  ? "bg-gradient-to-r from-primary-600 to-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
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
