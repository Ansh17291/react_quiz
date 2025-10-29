export const Roles = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
} as const;

export type Role = typeof Roles[keyof typeof Roles];

export interface User {
  id: string;
  name: string;
  role: Role;
  points: number;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Quiz {
  id: string;
  title: string;
  questionPool: Question[]; // Changed from 'questions' to 'questionPool'
  createdBy: 'AI' | 'MANUAL';
}

export interface QuizAssignment {
  id:string;
  quizId: string;
  studentIds: string[]; // 'ALL' or array of user IDs
  deadline: string; // ISO string
  timeLimit?: number; // Optional time limit in minutes
  numQuestionsToAssign: number; // How many questions to pull from the pool
  isLive: boolean; // Flag for live quizzes
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
}

export interface QuizResult {
  quizId: string;
  userId: string;
  score: number; // as a percentage
  answers: StudentAnswer[];
  timeTaken: number; // in seconds
  submittedAt: Date;
}

export interface AIAnalysis {
  questionText: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  remedialTopic: string;
}

export interface Resource {
    id: string;
    title: string;
    content: string;
    type: 'text' | 'notes';
}

export interface DiscussionReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface DiscussionPost {
  id:string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date;
  replies: DiscussionReply[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}
