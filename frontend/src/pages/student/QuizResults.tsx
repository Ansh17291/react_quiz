import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui";
import type { Question, StudentAnswer, AIAnalysis } from "../../types";
import {
  analyzeAnswer,
  generateQuizFromTopics,
} from "../../services/geminiService";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { Button, Card, Modal, Spinner } from "../../components/ui";
import {
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  TrophyIcon,
  SparklesIcon,
} from "../../components/Icons";
import { api } from "../../services/api";

const QuizResults = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { currentUser, addQuiz } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [result, setResult] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isRedesigning, setIsRedesigning] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch quiz and result data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch quizzes and results in parallel via shared API
        const [quizzesRes, resultsRes] = await Promise.all([
          api.getQuizzes(),
          api.getResults(),
        ]);

        const quizData = (quizzesRes || []).find((q: any) => q._id === quizId);
        let resultData = (resultsRes || []).find(
          (r: any) => r.quizId === quizId && r.userId === currentUser?._id
        );

        // Normalize result shape (timeTaken seconds, numeric)
        if (resultData) {
          const raw = resultData.timeTaken as any;
          let timeTakenNum = typeof raw === "string" ? parseInt(raw, 10) : raw;
          if (Number.isFinite(timeTakenNum) && timeTakenNum > 300000) {
            // looks like ms → convert to seconds
            timeTakenNum = Math.round(timeTakenNum / 1000);
          }
          if (!Number.isFinite(timeTakenNum)) timeTakenNum = 0;
          resultData = { ...resultData, timeTaken: timeTakenNum };
        }

        if (!quizData) {
          setError("Quiz not found");
          return;
        }

        if (!resultData) {
          setError("Result not found");
          return;
        }

        setQuiz(quizData);
        setResult(resultData);
      } catch (err) {
        console.error("Failed to fetch results data:", err);
        setError("Failed to load results. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId && currentUser?._id) {
      fetchData();
    }
  }, [quizId, currentUser?._id]);

  const handleAIAnalysis = async (
    question: Question,
    studentAnswer: StudentAnswer
  ) => {
    setIsLoadingAnalysis(true);
    setAnalysisError("");
    setAnalysis(null);
    setIsModalOpen(true);
    try {
      const isTextQuestion = question.type === 'text';
      const userAnswerText = isTextQuestion
        ? studentAnswer.textAnswer || "No answer provided"
        : (studentAnswer.selectedOptionIndex !== undefined && studentAnswer.selectedOptionIndex > -1
          ? question.options[studentAnswer.selectedOptionIndex]
          : "No answer provided");

      const analysisResult = await analyzeAnswer(question, userAnswerText);
      setAnalysis({
        ...analysisResult,
        questionText: question.questionText,
        yourAnswer: userAnswerText,
        correctAnswer: isTextQuestion
          ? (question.correctTextAnswer || "")
          : question.options[question.correctAnswerIndex],
        explanation: analysisResult.explanation,
        remedialTopic: analysisResult.remedialTopic,
      });
    } catch (e) {
      setAnalysisError((e as Error).message);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleRedesignQuiz = async () => {
    if (!quiz || !result) return;

    // Match questions using both _id and id
    const incorrectQuestions = quiz.questionPool.filter((q: any) => {
      const questionId = q._id || q.id;
      return result.answers.some(
        (a: any) => a.questionId === questionId && !a.isCorrect
      );
    });

    if (incorrectQuestions.length === 0) {
      addToast(
        "You got a perfect score! No weak topics to generate a quiz from.",
        "success"
      );
      return;
    }

    setIsRedesigning(true);
    try {
      const topics = incorrectQuestions.map((q: any) => q.questionText);
      const { title, questions } = await generateQuizFromTopics(
        topics,
        incorrectQuestions.length
      );

      const newQuiz = {
        _id: `quiz-db-${Date.now()}`,
        newAssignment: {},
        id: `quiz-${Date.now()}`,
        title,
        isPractice: true,
        questionPool: questions.map((q, i) => ({
          ...q,
          id: `q-${Date.now()}-${i}`,
          // Ensure all required Question fields are present
          questionText: q.questionText,
          type: q.type,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          correctTextAnswer: q.correctTextAnswer,
        })),
        createdBy: "AI" as const,
      };

      const { newAssignment } = await addQuiz(newQuiz, {
        studentIds: [currentUser!._id],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        numQuestionsToAssign: questions.length,
        timeLimit: questions.length,
        isLive: false,
      });

      addToast(
        "A new practice quiz has been generated and assigned to you!",
        "info"
      );
      navigate(`/quiz/${newAssignment._id}`);
    } catch (e) {
      addToast((e as Error).message, "error");
    } finally {
      setIsRedesigning(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error}</p>
          <Button onClick={() => navigate("/student")}>
            Back to Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  if (!result || !quiz) return <div>Result not found.</div>;

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <Card>
        <h2 className="text-3xl font-bold mb-2">Results for {quiz.title}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center text-lg">
          <p>
            <strong>Score:</strong>{" "}
            <span className="text-primary-400 font-bold">
              {result.answers.filter((a: any) => a.isCorrect).length}/
              {result.answers.length}
            </span>{" "}
            <strong> Percentage : ({result.score}%)</strong>
          </p>
          <p>
            <strong>Time Taken:</strong> {Math.floor(result.timeTaken / 60)}m{" "}
            {result.timeTaken % 60}s
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Button onClick={handleRedesignQuiz} disabled={isRedesigning}>
            {isRedesigning ? (
              <>
                <Spinner /> Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" /> Create Practice Quiz
              </>
            )}
          </Button>
          <Button
            onClick={() => navigate(`/leaderboard/${quizId}`)}
            variant="secondary"
          >
            <TrophyIcon className="w-5 h-5" /> View Quiz Leaderboard
          </Button>
          <Button onClick={() => navigate("/student")} variant="secondary">
            Back to Dashboard
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-2xl font-semibold mb-4">Answer Review</h3>
        <div className="space-y-6">
          {quiz.questionPool
            .map((q: any) => {
              // Normalize the question ID to handle both _id and id
              const questionId = q._id || q.id;
              const studentAnswer = result.answers.find(
                (a: any) => a.questionId === questionId
              );
              return studentAnswer
                ? { ...q, id: questionId, studentAnswer }
                : null;
            })
            .filter(Boolean)
            .map((questionData: any, index: number) => {
              const question = questionData;
              const studentAnswer = questionData.studentAnswer;

              const isCorrect = studentAnswer.isCorrect;
              const selectedOption = studentAnswer.selectedOptionIndex;
              const correctOption = question.correctAnswerIndex;

              return (
                <div key={question.id} className="p-4 rounded-lg theme-transition" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                  <p className="font-bold mb-2">
                    {index + 1}. {question.questionText}
                  </p>
                  <div className="space-y-2">
                    {question.type === 'text' ? (
                      <div className="space-y-2">
                        <div className={`p-3 rounded-md border ${isCorrect ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
                          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Your Answer:</p>
                          <p className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-red-500" />
                            )}
                            {studentAnswer.textAnswer || "No answer provided"}
                          </p>
                        </div>
                        {!isCorrect && (
                          <div className="p-3 rounded-md border bg-green-900/10 border-green-500/30">
                            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Correct Answer:</p>
                            <p className="text-green-400">{question.correctTextAnswer}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      question.options.map(
                        (option: string, optIndex: number) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded flex items-start gap-2 ${optIndex === correctOption ? "bg-green-900/50" : ""
                              } ${optIndex === selectedOption && !isCorrect
                                ? "bg-red-900/50"
                                : ""
                              }`}
                          >
                            {optIndex === correctOption && (
                              <CheckCircleIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            )}
                            {optIndex === selectedOption && !isCorrect && (
                              <XCircleIcon className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                            )}
                            {optIndex !== correctOption &&
                              optIndex !== selectedOption && (
                                <div className="w-6 h-6 shrink-0" />
                              )}
                            <span
                              className={`${optIndex === selectedOption ? "font-semibold" : ""
                                }`}
                            >
                              {option}
                            </span>
                          </div>
                        )
                      )
                    )}
                  </div>
                  {!isCorrect && (
                    <div className="mt-3">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          handleAIAnalysis(question, studentAnswer)
                        }
                      >
                        <LightBulbIcon className="w-5 h-5" /> Get AI Analysis
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="AI Answer Analysis"
      >
        {isLoadingAnalysis && (
          <div className="flex justify-center">
            <Spinner />
          </div>
        )}
        {analysisError && <p className="text-red-500">{analysisError}</p>}
        {analysis && (
          <div className="space-y-4" style={{ color: 'var(--text-muted)' }}>
            <div>
              <h4 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Question</h4>
              <p>{analysis.questionText}</p>
            </div>
            <div>
              <h4 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Your Answer</h4>
              <p className="text-red-400">{analysis.yourAnswer}</p>
            </div>
            <div>
              <h4 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                Correct Answer
              </h4>
              <p className="text-green-400">{analysis.correctAnswer}</p>
            </div>
            <div>
              <h4 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Explanation</h4>
              <div
                className="prose prose-sm max-w-none theme-transition"
                style={{ color: 'var(--text-muted)' }}
                dangerouslySetInnerHTML={{ __html: analysis.explanation }}
              />
            </div>
            <div>
              <h4 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                Recommended Topic to Study
              </h4>
              <p className="font-semibold text-primary-400">
                {analysis.remedialTopic}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </AnimatedWrapper>
  );
};

export default QuizResults;
