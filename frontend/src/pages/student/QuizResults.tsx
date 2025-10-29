import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../components/ui';
import type { Question, StudentAnswer, AIAnalysis } from '../../types';
import { analyzeAnswer, generateQuizFromTopics } from '../../services/geminiService';
import { AnimatedWrapper } from '../../components/shared/AnimatedComponents';
import { Button, Card, Modal, Spinner } from '../../components/ui';
import { CheckCircleIcon, XCircleIcon, LightBulbIcon, TrophyIcon, SparklesIcon } from '../../components/Icons';

const QuizResults = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const { quizzes, results, currentUser, addQuiz } = useAppContext();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const result = results.find(r => r.quizId === quizId && r.userId === currentUser?.id);
    const quiz = quizzes.find(q => q.id === quizId);

    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [isRedesigning, setIsRedesigning] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAIAnalysis = async (question: Question, studentAnswer: StudentAnswer) => {
        setIsLoadingAnalysis(true);
        setAnalysisError('');
        setAnalysis(null);
        setIsModalOpen(true);
        try {
            const userAnswerText = studentAnswer.selectedOptionIndex > -1 ? question.options[studentAnswer.selectedOptionIndex] : "No answer provided";
            const analysisResult = await analyzeAnswer(question, userAnswerText);
            setAnalysis({
                ...analysisResult,
                questionText: question.questionText,
                yourAnswer: userAnswerText,
                correctAnswer: question.options[question.correctAnswerIndex],
                explanation: analysisResult.explanation,
                remedialTopic: analysisResult.remedialTopic
            });
        } catch (e) {
            setAnalysisError((e as Error).message);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };
    
    const handleRedesignQuiz = async () => {
        if (!quiz || !result) return;

        const incorrectQuestions = quiz.questionPool.filter(q => 
            result.answers.some(a => a.questionId === q.id && !a.isCorrect)
        );

        if (incorrectQuestions.length === 0) {
            addToast("You got a perfect score! No weak topics to generate a quiz from.", 'success');
            return;
        }

        setIsRedesigning(true);
        try {
            const topics = incorrectQuestions.map(q => q.questionText);
            const { title, questions } = await generateQuizFromTopics(topics, incorrectQuestions.length);
            
            const newQuiz = {
                id: `quiz-${Date.now()}`,
                title,
                questionPool: questions.map((q, i) => ({
                    ...q,
                    id: `q-${Date.now()}-${i}`,
                    // Ensure all required Question fields are present
                    questionText: q.questionText,
                    options: q.options,
                    correctAnswerIndex: q.correctAnswerIndex,
                })),
                createdBy: 'AI' as const
            };

            const { newAssignment } = addQuiz(newQuiz, {
                studentIds: [currentUser!.id],
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                numQuestionsToAssign: questions.length,
                timeLimit: questions.length,
                isLive: false,
            });

            addToast("A new practice quiz has been generated and assigned to you!", 'info');
            navigate(`/quiz/${newAssignment.id}`);

        } catch (e) {
            addToast((e as Error).message, 'error');
        } finally {
            setIsRedesigning(false);
        }
    };

    if (!result || !quiz) return <div>Result not found.</div>;
    
    return (
        <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
            <Card>
                <h2 className="text-3xl font-bold mb-2">Results for {quiz.title}</h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 items-center text-lg">
                    <p><strong>Score:</strong> <span className="text-primary-400 font-bold">{result.score}%</span></p>
                    <p><strong>Time Taken:</strong> {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                    <Button onClick={handleRedesignQuiz} disabled={isRedesigning}>
                        {isRedesigning ? <><Spinner /> Generating...</> : <><SparklesIcon className="w-5 h-5"/> Create Practice Quiz</>}
                    </Button>
                     <Button onClick={() => navigate(`/leaderboard/${quizId}`)} variant="secondary">
                        <TrophyIcon className="w-5 h-5"/> View Quiz Leaderboard
                    </Button>
                    <Button onClick={() => navigate('/student')} variant="secondary">Back to Dashboard</Button>
                </div>
            </Card>

            <Card>
                <h3 className="text-2xl font-semibold mb-4">Answer Review</h3>
                <div className="space-y-6">
                    {quiz.questionPool.filter(q => result.answers.some(a => a.questionId === q.id)).map((question, index) => {
                        const studentAnswer = result.answers.find(a => a.questionId === question.id);
                        if (!studentAnswer) return null;

                        const isCorrect = studentAnswer.isCorrect;
                        const selectedOption = studentAnswer.selectedOptionIndex;
                        const correctOption = question.correctAnswerIndex;

                        return (
                            <div key={question.id} className="p-4 rounded-lg bg-slate-800">
                                <p className="font-bold mb-2">{index + 1}. {question.questionText}</p>
                                <div className="space-y-2">
                                    {question.options.map((option, optIndex) => (
                                        <div key={optIndex} className={`p-2 rounded flex items-start gap-2 ${optIndex === correctOption ? 'bg-green-900/50' : ''} ${optIndex === selectedOption && !isCorrect ? 'bg-red-900/50' : ''}`}>
                                            {optIndex === correctOption && <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"/>}
                                            {optIndex === selectedOption && !isCorrect && <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />}
                                            {optIndex !== correctOption && optIndex !== selectedOption && <div className="w-6 h-6 flex-shrink-0" />}
                                            <span className={`${optIndex === selectedOption ? 'font-semibold' : ''}`}>{option}</span>
                                        </div>
                                    ))}
                                </div>
                                {!isCorrect && (
                                    <div className="mt-3">
                                        <Button variant="secondary" onClick={() => handleAIAnalysis(question, studentAnswer)}>
                                          <LightBulbIcon className="w-5 h-5"/> Get AI Analysis
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="AI Answer Analysis">
                {isLoadingAnalysis && <div className="flex justify-center"><Spinner /></div>}
                {analysisError && <p className="text-red-500">{analysisError}</p>}
                {analysis && (
                    <div className="space-y-4 text-slate-300">
                        <div>
                            <h4 className="font-bold text-lg text-slate-100">Question</h4>
                            <p>{analysis.questionText}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-slate-100">Your Answer</h4>
                            <p className="text-red-400">{analysis.yourAnswer}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-slate-100">Correct Answer</h4>
                            <p className="text-green-400">{analysis.correctAnswer}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-slate-100">Explanation</h4>
                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: analysis.explanation }} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-slate-100">Recommended Topic to Study</h4>
                            <p className="font-semibold text-primary-400">{analysis.remedialTopic}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </AnimatedWrapper>
    );
};

export default QuizResults;
