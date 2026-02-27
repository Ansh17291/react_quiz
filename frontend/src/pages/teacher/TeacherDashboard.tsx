import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAppContext } from "../../context/AppContext";
import { Button, Card, Spinner, Tabs, useToast, Modal } from "../../components/ui";
import {
  TrophyIcon,
  UploadIcon,
  SparklesIcon,
  XCircleIcon,
  PlusCircleIcon,
  CalendarIcon,
} from "../../components/Icons";
import type { Difficulty } from "../../types";
import {
  generateQuizFromText,
  generateSimilarQuestions,
} from "../../services/geminiService";
import { BASE, api } from "../../services/api";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import MultiSelectDropdown from "../../components/shared/MultiSelectDropdown";
import Calendar from "../../components/shared/Calendar";

const TeacherDashboard = () => {
  const { users, results, addResource, removeUser, addQuiz } = useAppContext();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Overview");
  const [isCreating, setIsCreating] = useState(false);
  const [quizText, setQuizText] = useState("");
  const [uploadingGen, setUploadingGen] = useState(false);
  const txtInputRef = useRef<HTMLInputElement | null>(null);
  const genInputRef = useRef<HTMLInputElement | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [error, setError] = useState("");
  const [uploadingResource, setUploadingResource] = useState(false);
  const resourceInputRef = useRef<HTMLInputElement | null>(null);

  const [manualTitle, setManualTitle] = useState("");
  const [manualQuestions, setManualQuestions] = useState<any>([
    { questionText: "", type: 'multiple-choice', options: ["", "", "", ""], correctAnswerIndex: 0, correctTextAnswer: "" },
  ]);

  const students = useRef<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  // Add Student Modal State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const allStudents = useMemo(() => users.filter((u) => u.role === "STUDENT").map(u => ({ id: u._id || u.id, name: u.name })), [users]);

  useEffect(() => {
    students.current = users.filter((u) => u.role === "STUDENT");
  }, [users]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const [aRes, qRes] = await Promise.all([
          api.getAssignments(),
          api.getQuizzes()
        ]);
        setAssignments(aRes || []);
        setQuizzes(qRes || []);
      } catch (err) {
        console.error("Failed to fetch assignments:", err);
      }
    };
    fetchAssignments();
  }, []);

  const calendarEvents = useMemo(() => {
    return assignments.map(a => {
      const quiz = quizzes.find(q => String(q._id) === String(a.quizId));
      return {
        date: new Date(a.deadline),
        title: quiz ? `Quiz: ${quiz.title}` : 'Quiz Deadline',
        type: 'quiz' as const,
        onClick: () => {
          if (quiz) navigate(`/admin/quizzes`);
        }
      };
    });
  }, [assignments, quizzes, navigate]);

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentPassword.trim()) {
      addToast("Please provide both username and password.", "error");
      return;
    }

    if (newStudentPassword.length < 6) {
      addToast("Password must be at least 6 characters long.", "error");
      return;
    }

    setIsAddingStudent(true);
    try {
      const response = await fetch(`${BASE}/api/user/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newStudentName,
          password: newStudentPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add student");
      }

      const newStudent = await response.json();
      students.current = [...students.current, newStudent];

      addToast(`Student "${newStudentName}" added successfully!`, "success");
      addToast(
        `Credentials - Username: ${newStudentName}, Password: ${newStudentPassword}`,
        "info"
      );

      // Reset form and close modal
      setNewStudentName("");
      setNewStudentPassword("");
      setIsAddStudentModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast((err as Error).message || "Failed to add student", "error");
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleUploadResourceFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResource(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", file.name);
      const resp = await fetch(`${BASE}/api/resources/upload`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      const resource = await resp.json();
      addResource({
        ...(resource as any),
        _id: resource._id || resource.id,
        id: resource._id || resource.id,
      } as any);
      addToast("Resource uploaded and added to Resources", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to upload resource", "error");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleRevokeStudent = (userId: string) => {
    if (
      window.confirm("Are you sure you want to revoke this student's access?")
    ) {
      removeUser(userId);
      addToast("Student access revoked.", "success");
    }
  };

  const leaderboard = useMemo(() => {
    return [...students.current].sort((a, b) => b.points - a.points);
  }, [students.current]);

  const studentPerformance = useMemo(() => {
    return students.current.map((student) => {
      const studentResults = results.filter((r) => r.userId === student.id);
      const avgScore =
        studentResults.length > 0
          ? studentResults.reduce((acc, r) => acc + r.score, 0) /
          studentResults.length
          : 0;
      return {
        name: student.name,
        avgScore: Math.round(avgScore),
        quizzesTaken: studentResults.length,
      };
    });
  }, [students.current, results]);

  const rankBadges = ["🥇", "🥈", "🥉"];

  return (
    <AnimatedWrapper className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
        <div className="flex items-center gap-6">
          <Button
            onClick={() => navigate("/admin/quizzes")}
            variant="secondary"
            className="mr-2"
          >
            View All Quizzes
          </Button>
          <Button onClick={() => navigate("/admin/polls")} variant="secondary" className="mr-2">
            Manage Polls
          </Button>
          <Button
            onClick={() => setIsCalendarModalOpen(true)}
            variant="secondary"
            className="mr-2"
          >
            <CalendarIcon className="w-5 h-5" />
            Calendar
          </Button>
          <Tabs
            tabs={["Overview", "Manage Students", "Create Quiz", "Upload Resources"]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>

      {activeTab === "Overview" && (
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <h3 className="text-xl font-semibold mb-4">
              Class Leaderboard (by Points)
            </h3>
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <StaggeredList className="space-y-2">
                {leaderboard.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex justify-between items-center p-3 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer transition-colors theme-transition"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    onClick={() => navigate(`/student/${student.id}`)}
                  >
                    <span className="font-medium flex items-center gap-3">
                      <span
                        className={`text-xl w-6 text-center ${index < 3 ? "" : "text-slate-400"
                          }`}
                      >
                        {rankBadges[index] || index + 1}
                      </span>
                      {student.name}
                    </span>
                    <span className="font-bold text-yellow-400 flex items-center gap-1">
                      <TrophyIcon className="w-5 h-5" />
                      {student.points}
                    </span>
                  </div>
                ))}
              </StaggeredList>
            </div>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-4">
              Student Performance Overview
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={studentPerformance}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="avgScore"
                  fill="#4f46e5"
                  name={`Average Score (${(
                    studentPerformance.reduce(
                      (sum, item) => sum + item.avgScore,
                      0
                    ) / studentPerformance.length || 0
                  ).toFixed(2)}%)`}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div >
      )}

      {/* Calendar Modal */}
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title="Quiz Calendar"
      >
        <div className="p-0 overflow-hidden">
          <Calendar events={calendarEvents} compact={true} />
        </div>
      </Modal>

      {
        activeTab === "Manage Students" && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Student Roster</h3>
              <Button
                onClick={() => setIsAddStudentModalOpen(true)}
                variant="secondary"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Add Student
              </Button>
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <StaggeredList className="space-y-2">
                {students.current.map((student) => (
                  <div
                    key={student._id}
                    className="flex justify-between items-center p-3 rounded-lg theme-transition"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <span>{student.name}</span>
                    <div className="flex items-center gap-2">
                      {editingUserId === student._id ? (
                        <>
                          <input
                            type="password"
                            placeholder="New password"
                            className="p-2 rounded border focus:outline-none focus:ring-2 focus:ring-[var(--accent)] theme-transition custom-scrollbar"
                            style={{ background: 'var(--surface-3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              if (!newPassword.trim()) return;
                              await api.updateUserPassword(
                                student._id,
                                newPassword
                              );
                              setEditingUserId(null);
                              setNewPassword("");
                              addToast("Password updated", "success");
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingUserId(null);
                              setNewPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingUserId(student._id)}
                          >
                            Edit Password
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleRevokeStudent(student._id)}
                          >
                            Revoke Access
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </StaggeredList>
            </div>
          </Card>
        )
      }

      {
        activeTab === "Create Quiz" && (
          <div className="space-y-8">
            <Card>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-primary-400" />
                Generate Quiz with AI
              </h3>
              <div className="space-y-4">
                <textarea
                  value={quizText}
                  onChange={(e) => setQuizText(e.target.value)}
                  className="w-full h-40 p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 theme-transition custom-scrollbar"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Paste the content for the quiz here..."
                />
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <label className="block">
                    <span style={{ color: 'var(--text-muted)' }}>Questions to generate:</span>
                    <input
                      type="number"
                      value={numQuestions}
                      onChange={(e) =>
                        setNumQuestions(Math.max(1, parseInt(e.target.value)))
                      }
                      className="mt-1 block w-28 rounded-md shadow-sm focus:ring focus:ring-primary-200 focus:ring-opacity-50 theme-transition"
                      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </label>
                  <label className="block">
                    <span style={{ color: 'var(--text-muted)' }}>Difficulty:</span>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                      className="mt-1 block w-28 rounded-md shadow-sm focus:ring focus:ring-primary-200 focus:ring-opacity-50 theme-transition"
                      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </label>
                  <div className="grow"></div>
                  <label className="cursor-pointer">
                    <Button
                      as="span"
                      variant="secondary"
                      onClick={() => txtInputRef.current?.click()}
                    >
                      <UploadIcon className="w-5 h-5" /> Upload .txt
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) =>
                        setQuizText(String(ev.target?.result || ""));
                      reader.readAsText(file);
                    }}
                    ref={txtInputRef}
                  />
                  <label className="cursor-pointer">
                    <Button
                      variant="secondary"
                      disabled={uploadingGen}
                      onClick={() => genInputRef.current?.click()}
                    >
                      <UploadIcon className="w-5 h-5" /> Upload docx/xlsx/pptx
                    </Button>
                  </label>
                  <input
                    id="gen-upload"
                    type="file"
                    accept=".docx,.xlsx,.pptx,.txt"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingGen(true);
                      try {
                        const form = new FormData();
                        form.append("file", file);
                        const resp = await fetch(
                          `${BASE}/api/quizzes/generate-from-upload`,
                          { method: "POST", body: form }
                        );
                        if (!resp.ok)
                          throw new Error(`Upload failed: ${resp.status}`);
                        const data = await resp.json();
                        if (data.text) setQuizText(data.text);
                      } finally {
                        setUploadingGen(false);
                      }
                    }}
                    ref={genInputRef}
                  />
                  <MultiSelectDropdown
                    options={allStudents}
                    selectedIds={selectedStudentIds}
                    onSelect={setSelectedStudentIds}
                    placeholder="Assign students..."
                    label="Assign Students"
                  />
                  <Button
                    onClick={async () => {
                      if (!quizText.trim()) {
                        setError(
                          "Please provide some text to generate the quiz from."
                        );
                        return;
                      }
                      setIsCreating(true);
                      setError("");
                      try {
                        const { title, questions } = await generateQuizFromText(
                          quizText,
                          numQuestions,
                          difficulty
                        );
                        await addQuiz(
                          { title, questionPool: questions } as any,
                          {
                            studentIds: selectedStudentIds,
                            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            timeLimit: 10,
                            isLive: false,
                            numQuestionsToAssign: questions.length
                          } as any
                        );
                        setSelectedStudentIds([]);
                        addToast("Quiz generated and assigned successfully!", "success");
                      } catch (e: any) {
                        setError(e.message || "Failed to generate quiz");
                      } finally {
                        setIsCreating(false);
                      }
                    }}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Spinner /> Generating...
                      </>
                    ) : (
                      "Generate & Create Quiz"
                    )}
                  </Button>
                </div>
                {error && <p className="text-red-500">{error}</p>}
              </div>
            </Card>

            <Card>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-semibold">Create Quiz Manually</h3>

                <MultiSelectDropdown
                  options={allStudents}
                  selectedIds={selectedStudentIds}
                  onSelect={setSelectedStudentIds}
                  placeholder="Choose students..."
                  label="Assign Students"
                />
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Quiz Title"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full p-2 border rounded-md theme-transition"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <div className="space-y-4">
                  {manualQuestions.map((q: any, qIndex: number) => (
                    <div
                      key={qIndex}
                      className="p-4 border rounded-lg space-y-3 relative theme-transition"
                      style={{ background: 'var(--surface-3)', borderColor: 'var(--border)' }}
                    >
                      {manualQuestions.length > 1 && (
                        <button
                          onClick={() =>
                            setManualQuestions((prev: any[]) =>
                              prev.filter((_, i) => i !== qIndex)
                            )
                          }
                          className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                        >
                          <XCircleIcon className="w-6 h-6" />
                        </button>
                      )}
                      <textarea
                        value={q.questionText}
                        onChange={(e) => {
                          const updated = [...manualQuestions];
                          updated[qIndex].questionText = e.target.value;
                          setManualQuestions(updated);
                        }}
                        placeholder={`Question ${qIndex + 1}`}
                        className="w-full p-2 border rounded-md theme-transition custom-scrollbar"
                        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className="block">
                          <span style={{ color: 'var(--text-muted)' }}>Question Type</span>
                          <select
                            value={q.type || 'multiple-choice'}
                            onChange={(e) => {
                              const updated = [...manualQuestions];
                              updated[qIndex].type = e.target.value;
                              setManualQuestions(updated);
                            }}
                            className="mt-1 block w-full p-2 rounded-md theme-transition"
                            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          >
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="text">Text (Open Ended)</option>
                          </select>
                        </label>
                      </div>

                      {(q.type === 'multiple-choice' || !q.type) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt: string, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={q.correctAnswerIndex === optIndex}
                                onChange={() => {
                                  const updated = [...manualQuestions];
                                  updated[qIndex].correctAnswerIndex = optIndex;
                                  setManualQuestions(updated);
                                }}
                                className="h-5 w-5 text-primary-600 focus:ring-primary-500 focus:ring-offset-[var(--surface-3)]"
                                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                              />
                              <input
                                type="text"
                                placeholder={`Option ${optIndex + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...manualQuestions];
                                  updated[qIndex].options[optIndex] =
                                    e.target.value;
                                  setManualQuestions(updated);
                                }}
                                className="w-full p-2 border rounded-md theme-transition"
                                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block">
                            <span style={{ color: 'var(--text-muted)' }}>Correct Answer (Text)</span>
                            <input
                              type="text"
                              placeholder="Enter the correct answer"
                              value={q.correctTextAnswer || ""}
                              onChange={(e) => {
                                const updated = [...manualQuestions];
                                updated[qIndex].correctTextAnswer = e.target.value;
                                setManualQuestions(updated);
                              }}
                              className="w-full p-2 border rounded-md theme-transition"
                              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            />
                          </label>
                          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                            Students will need to type this answer exactly (case-insensitive) to get points.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t theme-transition" style={{ borderColor: 'var(--border)' }}>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setManualQuestions((prev: any[]) => [
                        ...prev,
                        { questionText: "", type: 'multiple-choice', options: ["", "", "", ""], correctAnswerIndex: 0, correctTextAnswer: "" },
                      ])
                    }
                  >
                    <PlusCircleIcon className="w-5 h-5" /> Add Question
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={isCreating}
                    onClick={async () => {
                      if (
                        manualQuestions.length === 0 ||
                        !manualQuestions[
                          manualQuestions.length - 1
                        ].questionText.trim()
                      )
                        return;
                      const baseQuestion =
                        manualQuestions[manualQuestions.length - 1];
                      setIsCreating(true);
                      try {
                        const newQs = await generateSimilarQuestions(
                          baseQuestion,
                          2
                        );
                        setManualQuestions((prev: any[]) => [...prev, ...newQs]);
                      } finally {
                        setIsCreating(false);
                      }
                    }}
                  >
                    <SparklesIcon className="w-5 h-5" /> Generate with AI
                  </Button>

                  <div className="hidden md:block grow"></div>

                  <Button
                    onClick={async () => {
                      if (!manualTitle.trim()) {
                        addToast("Please enter a quiz title", "error");
                        return;
                      }
                      setIsCreating(true);
                      try {
                        await addQuiz(
                          { title: manualTitle, questionPool: manualQuestions } as any,
                          {
                            studentIds: selectedStudentIds,
                            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            timeLimit: 10,
                            isLive: false,
                            numQuestionsToAssign: manualQuestions.length
                          } as any
                        );
                        setManualTitle("");
                        setManualQuestions([
                          {
                            questionText: "",
                            options: ["", "", "", ""],
                            correctAnswerIndex: 0,
                          }
                        ]);
                        setSelectedStudentIds([]);
                        addToast("Manual quiz created and assigned successfully!", "success");
                      } catch (e: any) {
                        addToast(e.message || "Failed to create quiz", "error");
                      } finally {
                        setIsCreating(false);
                      }
                    }}
                    disabled={isCreating}
                    className="w-full md:w-auto px-10 bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/20"
                  >
                    {isCreating ? <Spinner /> : "Create Quiz"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )
      }

      {
        activeTab === "Upload Resources" && (
          <Card>
            <h3 className="text-xl font-semibold mb-4">Upload Resource File</h3>
            <p className="mb-2" style={{ color: 'var(--text-muted)' }}>
              Upload Word/Excel/PPT/Text files to Resources for students to
              download.
            </p>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <Button
                  variant="secondary"
                  disabled={uploadingResource}
                  onClick={() => resourceInputRef.current?.click()}
                >
                  <UploadIcon className="w-5 h-5" /> Upload Resource
                </Button>
              </label>
              <input
                id="resource-upload"
                type="file"
                accept=".docx,.xlsx,.pptx,.txt,.pdf"
                className="hidden"
                onChange={handleUploadResourceFile}
                ref={resourceInputRef}
              />
            </div>
          </Card>
        )
      }

      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => {
          setIsAddStudentModalOpen(false);
          setNewStudentName("");
          setNewStudentPassword("");
        }}
        title="Add New Student"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Student Username
            </label>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Enter username"
              className="w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 theme-transition"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={newStudentPassword}
              onChange={(e) => setNewStudentPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
              className="w-full p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 theme-transition"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Make sure to save these credentials - they will be shown once
              after creation
            </p>
          </div>
          <Button
            onClick={handleAddStudent}
            className="w-full"
            disabled={isAddingStudent}
          >
            {isAddingStudent ? (
              <>
                <Spinner /> Adding Student...
              </>
            ) : (
              "Add Student"
            )}
          </Button>
        </div>
      </Modal>
    </AnimatedWrapper >
  );
};

export default TeacherDashboard;
