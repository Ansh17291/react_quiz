import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import type { Question, StudentAnswer, QuizResult } from '../../types';
import { Button, Card, Spinner, Modal } from '../../components/ui';

const QuizTaker = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const { quizzes, currentUser, addResult, assignments } = useAppContext();
    const navigate = useNavigate();
    
    const assignment = assignments.find(a => a.id === assignmentId);
    const quiz = quizzes.find(q => q.id === assignment?.quizId);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    
    const handleSubmitRef = useRef(handleSubmit);
    handleSubmitRef.current = handleSubmit;

    // Shuffle array utility
    const shuffleArray = <T,>(array: T[]): T[] => {
        return [...array].sort(() => Math.random() - 0.5);
    };
    
    // Setup and start the quiz
    const startQuiz = useCallback(() => {
        if (!quiz || !assignment) return;

        // 1. Get question pool and shuffle it
        const shuffledPool = shuffleArray(quiz.questionPool);
        // 2. Slice the required number of questions
        const assignedQuestions = shuffledPool.slice(0, assignment.numQuestionsToAssign);
        // 3. Shuffle options for each question and update correct index
        const readyQuestions = assignedQuestions.map((q: Question) => {
            const originalCorrectAnswerText = q.options[q.correctAnswerIndex];
            const shuffledOptions = shuffleArray(q.options);
            const newCorrectAnswerIndex = shuffledOptions.findIndex(opt => opt === originalCorrectAnswerText);
            return {
                ...q,
                options: shuffledOptions,
                correctAnswerIndex: newCorrectAnswerIndex,
            };
        });

        setActiveQuestions(readyQuestions);
        const timeLimitInSeconds = (assignment.timeLimit || readyQuestions.length) * 60;
        setTimeLeft(timeLimitInSeconds);
        setStartTime(Date.now());
        setIsQuizStarted(true);

        // Enter fullscreen
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });

    }, [quiz, assignment]);


    function handleSubmit() {
        if (!quiz || !currentUser || activeQuestions.length === 0) return;
        
        const studentAnswers: StudentAnswer[] = activeQuestions.map(q => {
            const selectedOptionIndex = selectedAnswers[q.id] ?? -1;
            return {
                questionId: q.id,
                selectedOptionIndex,
                isCorrect: selectedOptionIndex === q.correctAnswerIndex
            };
        });

        const correctCount = studentAnswers.filter(a => a.isCorrect).length;
        const score = Math.round((correctCount / activeQuestions.length) * 100);
        const timeTaken = Math.round((Date.now() - startTime) / 1000);

        const result: QuizResult = {
            quizId: quiz.id,
            userId: currentUser.id,
            score,
            answers: studentAnswers,
            timeTaken,
            submittedAt: new Date(),
        };
        
        addResult(result);
        navigate(`/results/${quiz.id}`, { replace: true });
    };

    // Proctoring and Timer effect
    useEffect(() => {
        if (!isQuizStarted) return;
        
        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleSubmitRef.current();
            }
        };
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                handleSubmitRef.current();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        if (!quiz || !assignment) return;
        if (new Date(assignment.deadline) < new Date()) {
             navigate('/student', { replace: true }); 
             return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmitRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        };
    }, [isQuizStarted, quiz, assignment, navigate]);

    const handleAnswerSelect = (questionId: string, optionIndex: number) => {
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };
    
    if (!quiz) return <div>Quiz not found or expired.</div>;

    if (!isQuizStarted) {
        return (
            <Modal isOpen={true} onClose={() => navigate('/student')} title="Quiz Instructions">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold">You are about to start "{quiz.title}"</h2>
                    <p className="text-lg text-slate-300">This quiz will start in <span className="font-bold text-red-400">full-screen mode</span>.</p>
                    <p className="text-slate-400">To ensure a fair testing environment, exiting full-screen or switching to another tab will automatically submit your quiz. Please stay focused on the test.</p>
                    <p>Good luck!</p>
                    <Button onClick={startQuiz} className="text-lg px-8 py-3">Start Quiz</Button>
                </div>
            </Modal>
        )
    }

    if (activeQuestions.length === 0) return <div className="flex justify-center items-center h-64"><Spinner /></div>;

    const currentQuestion = activeQuestions[currentQuestionIndex];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <Card className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
                <h2 className="text-2xl font-bold">{quiz.title}</h2>
                <div className="text-xl font-semibold bg-red-900 text-red-200 px-3 py-1 rounded-md">
                    {minutes}:{seconds < 10 ? '0' : ''}{seconds}
                </div>
            </div>
            
            <div>
                <h3 className="text-xl font-semibold mb-2">Question {currentQuestionIndex + 1} of {activeQuestions.length}</h3>
                <p className="text-lg mb-6">{currentQuestion.questionText}</p>
                
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${selectedAnswers[currentQuestion.id] === index ? 'bg-primary-900 border-primary-500' : 'bg-slate-700 hover:bg-slate-600 border-transparent'}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex justify-between">
                <Button 
                    variant="secondary"
                    onClick={() => setCurrentQuestionIndex(p => p - 1)}
                    disabled={currentQuestionIndex === 0}
                >
                    Previous
                </Button>
                {currentQuestionIndex < activeQuestions.length - 1 ? (
                    <Button onClick={() => setCurrentQuestionIndex(p => p + 1)}>Next</Button>
                ) : (
                    <Button onClick={handleSubmit}>Submit Quiz</Button>
                )}
            </div>
        </Card>
    );
};

export default QuizTaker;
