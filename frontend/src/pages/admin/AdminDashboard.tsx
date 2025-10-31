import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui";
import type { Quiz, Question, Resource } from "../../types";
import {
  generateQuizFromText,
  generateSimilarQuestions,
} from "../../services/geminiService";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import { Button, Card, Modal, Spinner, Tabs } from "../../components/ui";
import { BASE } from "../../services/api";
import {
  UploadIcon,
  XCircleIcon,
  PlusCircleIcon,
  SparklesIcon,
} from "../../components/Icons";
import axios from "axios";
import { api } from "../../services/api";

const AdminDashboard = () => {
  const { addQuiz, addResource, users, removeUser } = useAppContext();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("Create Quiz");

  const students = useRef<any>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [quizText, setQuizText] = useState("");
  const [uploadingGen, setUploadingGen] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const txtInputRef = useRef<HTMLInputElement | null>(null);
  const genInputRef = useRef<HTMLInputElement | null>(null);
  const resourceInputRef = useRef<HTMLInputElement | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [error, setError] = useState("");

  const [manualTitle, setManualTitle] = useState("");
  const [manualQuestions, setManualQuestions] = useState<any>([
    { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 },
  ]);
  const [timeLimit, setTimeLimit] = useState(10);
  const [numQuestionsToAssign, setNumQuestionsToAssign] = useState(5);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [quizToAssign, setQuizToAssign] = useState<Quiz | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [isLiveQuiz, setIsLiveQuiz] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const data = await api.getUsers();
      console.log(data);
      students.current = (data || []).filter((u) => u.role === "STUDENT");
    };
    fetchData();
  }, []);

  //   const students = users.filter();

  const openAssignModal = (quiz: Quiz) => {
    setQuizToAssign(quiz);
    setIsAssignModalOpen(true);
  };

  const handleAssignQuiz = () => {
    if (!quizToAssign || selectedStudents.length === 0) {
      addToast("Please select at least one student.", "error");
      return;
    }

    const finalDeadline = isLiveQuiz
      ? new Date(Date.now() + 5 * 60 * 1000)
      : new Date(deadline);
    const finalTimeLimit = isLiveQuiz ? 5 : timeLimit;

    addQuiz(quizToAssign, {
      studentIds: selectedStudents,
      deadline: finalDeadline.toISOString(),
      timeLimit: finalTimeLimit,
      numQuestionsToAssign,
      isLive: isLiveQuiz,
    });

    addToast(`Quiz "${quizToAssign.title}" assigned successfully!`, "success");
    addToast(`In a full-stack app, emails would be sent to students.`, "info");
    setIsAssignModalOpen(false);
    setQuizToAssign(null);
    setSelectedStudents([]);
  };

  const handleGenerateQuiz = async () => {
    if (!quizText.trim()) {
      setError("Please provide some text to generate the quiz from.");
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const { title, questions } = await generateQuizFromText(
        quizText,
        numQuestions
      );
      const newQuiz: Quiz = {
        title,
        questionPool: questions.map((q) => ({
          ...q,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
        })),
        createdBy: "AI",
      };
      openAssignModal(newQuiz);
      setQuizText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setQuizText(text);
        const newResource: Resource = {
          _id: `res-${Date.now()}`,
          title: file.name,
          content: text,
          type: "text",
        };
        addResource(newResource);
        addToast(
          `File "${file.name}" uploaded and saved to Resources`,
          "success"
        );
      };
      reader.readAsText(file);
    }
  };

  const handleUploadForGeneration = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGen(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch(`${BASE}/api/quizzes/generate-from-upload`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      const data = await resp.json();
      if (data.text) {
        setQuizText(data.text);
        addToast(
          `Extracted text from ${file.name}. You can now Generate & Assign.`,
          "success"
        );
      } else {
        addToast(
          `Uploaded ${file.name}. No text extracted (file stored).`,
          "info"
        );
      }
      // Also add to resources list so it appears for students
      if (data.fileUrl) {
        addResource({
          _id: `res-${Date.now()}`,
          id: `res-${Date.now()}`,
          title: data.originalName || file.name,
          content: data.fileUrl,
          type: 'file',
        } as any);
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to process uploaded file for generation", "error");
    } finally {
      setUploadingGen(false);
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
      // Normalize the resource id fields for the context
      addResource({ ...(resource as any), _id: resource._id || resource.id, id: resource._id || resource.id } as any);
      addToast("Resource uploaded and added to Resources", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to upload resource", "error");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleManualQuestionChange = (
    index: number,
    field: string,
    value: any
  ) => {
    const updatedQuestions = [...manualQuestions];
    if (field === "option") {
      updatedQuestions[index].options[value.optIndex] = value.text;
    } else {
      (updatedQuestions[index] as any)[field] = value;
    }
    setManualQuestions(updatedQuestions);
  };

  const addManualQuestion = () => {
    setManualQuestions([
      ...manualQuestions,
      { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 },
    ]);
  };

  const generateMoreQuestionsAI = async () => {
    if (
      manualQuestions.length === 0 ||
      !manualQuestions[manualQuestions.length - 1].questionText.trim()
    ) {
      addToast(
        "Please write the last question before generating more.",
        "error"
      );
      return;
    }
    setIsCreating(true);
    try {
      const baseQuestion = manualQuestions[manualQuestions.length - 1];
      const newQuestions = await generateSimilarQuestions(baseQuestion, 2);
      setManualQuestions((prev) => [...prev, ...newQuestions]);
      addToast("AI generated 2 new questions!", "success");
    } catch (e) {
      addToast((e as Error).message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const removeManualQuestion = (index: number) => {
    setManualQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateManualQuiz = () => {
    if (!manualTitle.trim()) {
      addToast("Please enter a quiz title.", "error");
      return;
    }
    if (numQuestionsToAssign > manualQuestions.length) {
      addToast(
        `Cannot assign ${numQuestionsToAssign} questions when only ${manualQuestions.length} are in the pool.`,
        "error"
      );
      return;
    }
    const newQuiz: Quiz = {
      _id: `quiz-${Date.now()}`,
      title: manualTitle,
      questionPool: manualQuestions.map((q, i) => ({
        ...q,
        _id: `q-man-${Date.now()}-${i}`,
      })),
      createdBy: "MANUAL",
    };
    openAssignModal(newQuiz);
    setManualTitle("");
    setManualQuestions([
      { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 },
    ]);
  };

  const handleRevokeStudent = (userId: string) => {
    if (
      window.confirm("Are you sure you want to revoke this student's access?")
    ) {
      removeUser(userId);
      addToast("Student access revoked.", "success");
    }
  };

  return (
    <AnimatedWrapper className="space-y-8">
      <h2 className="text-3xl font-bold">Admin Dashboard</h2>
      <div>
        <Tabs
          tabs={["Create Quiz", "Manage Students"]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <div className="mt-6">
          {activeTab === "Create Quiz" && (
            <div className="space-y-8">
              <Card>
                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <SparklesIcon className="w-6 h-6 text-primary-400" />
                  Generate Quiz with AI
                </h3>
                <div className="space-y-4">
                  <p className="text-slate-300">
                    Paste text, or upload a .txt file. The AI will generate a
                    quiz based on the content.
                  </p>
                  <textarea
                    value={quizText}
                    onChange={(e) => setQuizText(e.target.value)}
                    className="w-full h-40 p-2 border rounded-md bg-slate-700 border-slate-600 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Paste the content for the quiz here..."
                  />
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <label className="block">
                      <span className="text-gray-300">
                        Questions to generate:
                      </span>
                      <input
                        type="number"
                        value={numQuestions}
                        onChange={(e) =>
                          setNumQuestions(Math.max(1, parseInt(e.target.value)))
                        }
                        className="mt-1 block w-28 rounded-md border-slate-600 shadow-sm bg-slate-700 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                    </label>
                    <div className="flex-grow"></div>
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
                      onChange={handleFileChange}
                      ref={txtInputRef}
                    />
                    <label className="cursor-pointer">
                      <Button
                        as="span"
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
                      onChange={handleUploadForGeneration}
                      ref={genInputRef}
                    />
                    <Button onClick={handleGenerateQuiz} disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Spinner /> Generating...
                        </>
                      ) : (
                        "Generate & Assign"
                      )}
                    </Button>
                  </div>
                  {error && <p className="text-red-500">{error}</p>}
                </div>
              </Card>
              <Card>
                <h3 className="text-xl font-semibold mb-4">
                  Create Quiz Manually
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Quiz Title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full p-2 border rounded-md bg-slate-700 border-slate-600"
                  />
                  <div className="grid md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-lg">
                    <label className="block">
                      <span className="text-gray-300">Time Limit (mins)</span>
                      <input
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                        className="mt-1 block w-full p-2 rounded-md bg-slate-700 border-slate-600"
                      />
                    </label>
                    <label className="block">
                      <span className="text-gray-300">Questions to Assign</span>
                      <input
                        type="number"
                        value={numQuestionsToAssign}
                        onChange={(e) =>
                          setNumQuestionsToAssign(parseInt(e.target.value))
                        }
                        className="mt-1 block w-full p-2 rounded-md bg-slate-700 border-slate-600"
                      />
                    </label>
                    <label className="block">
                      <span className="text-gray-300">Total in Pool</span>
                      <input
                        type="number"
                        value={manualQuestions.length}
                        readOnly
                        className="mt-1 block w-full p-2 rounded-md bg-slate-800 border-slate-600 cursor-not-allowed"
                      />
                    </label>
                  </div>
                  <div className="space-y-4">
                    {manualQuestions.map((q, qIndex) => (
                      <div
                        key={qIndex}
                        className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-3 relative"
                      >
                        {manualQuestions.length > 1 && (
                          <button
                            onClick={() => removeManualQuestion(qIndex)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
                          >
                            <XCircleIcon className="w-6 h-6" />
                          </button>
                        )}
                        <textarea
                          value={q.questionText}
                          onChange={(e) =>
                            handleManualQuestionChange(
                              qIndex,
                              "questionText",
                              e.target.value
                            )
                          }
                          placeholder={`Question ${qIndex + 1}`}
                          className="w-full p-2 border rounded-md bg-slate-700 border-slate-600"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt, optIndex) => (
                            <div
                              key={optIndex}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="radio"
                                name={`correct-answer-${qIndex}`}
                                checked={q.correctAnswerIndex === optIndex}
                                onChange={() =>
                                  handleManualQuestionChange(
                                    qIndex,
                                    "correctAnswerIndex",
                                    optIndex
                                  )
                                }
                                className="h-5 w-5 text-primary-600 bg-slate-700 border-slate-500 focus:ring-primary-500"
                              />
                              <input
                                type="text"
                                placeholder={`Option ${optIndex + 1}`}
                                value={opt}
                                onChange={(e) =>
                                  handleManualQuestionChange(qIndex, "option", {
                                    optIndex,
                                    text: e.target.value,
                                  })
                                }
                                className="w-full p-2 border rounded-md bg-slate-700 border-slate-600"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-700">
                    <Button onClick={addManualQuestion} variant="secondary">
                      <PlusCircleIcon className="w-5 h-5" />
                      Add Question
                    </Button>
                    <Button
                      onClick={generateMoreQuestionsAI}
                      variant="secondary"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Spinner />
                          Generating...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-5 h-5" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                    <div className="flex-grow"></div>
                    <Button
                      onClick={() => {
                        setIsLiveQuiz(false);
                        handleCreateManualQuiz();
                      }}
                    >
                      Create & Assign
                    </Button>
                    <Button
                      onClick={() => {
                        setIsLiveQuiz(true);
                        handleCreateManualQuiz();
                      }}
                      variant="danger"
                    >
                      Host as Live Quiz
                    </Button>
                  </div>
                </div>
              </Card>
              <Card>
                <h3 className="text-xl font-semibold mb-4">
                  Upload Resource File
                </h3>
                <p className="text-slate-300 mb-2">
                  Upload Word/Excel/PPT/Text files to Resources for students to
                  download.
                </p>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <Button
                      as="span"
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
            </div>
          )}
          {activeTab === "Manage Students" && (
            <Card>
              <h3 className="text-xl font-semibold mb-4">Student Roster</h3>
              <StaggeredList className="space-y-2">
                {students.current.map((student) => (
                  <div
                    key={student._id}
                    className="flex justify-between items-center p-3 bg-slate-700 rounded-lg"
                  >
                    <span>{student.name}</span>
                    <Button
                      variant="danger"
                      onClick={() => handleRevokeStudent(student._id)}
                    >
                      Revoke Access
                    </Button>
                  </div>
                ))}
              </StaggeredList>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Quiz: ${quizToAssign?.title}`}
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-bold mb-2">Select Students</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-700 rounded-md">
              <label className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelectedStudents(
                      e.target.checked ? students.current.map((s) => s._id) : []
                    )
                  }
                  className="h-4 w-4 rounded"
                />
                Select All Students
              </label>
              {students.current.map((student) => (
                <label
                  key={student._id}
                  className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student._id)}
                    onChange={(e) => {
                      setSelectedStudents((prev) =>
                        e.target.checked
                          ? [...prev, student._id]
                          : prev.filter((_id) => _id !== student._id)
                      );
                    }}
                    className="h-4 w-4 rounded"
                  />
                  {student.name}
                </label>
              ))}
            </div>
          </div>
          {!isLiveQuiz && (
            <div>
              <h4 className="font-bold mb-2">Set Deadline</h4>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-2 border rounded-md bg-slate-700 border-slate-600"
              />
            </div>
          )}
          {isLiveQuiz && (
            <p className="text-yellow-300 bg-yellow-900/50 p-3 rounded-md">
              This is a Live Quiz. It will start immediately and last for 5
              minutes.
            </p>
          )}
          <Button onClick={handleAssignQuiz} className="w-full">
            Confirm Assignment
          </Button>
        </div>
      </Modal>
    </AnimatedWrapper>
  );
};

export default AdminDashboard;
