export const Roles = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
} as const;

export type Role = typeof Roles[keyof typeof Roles];

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface User {
  _id: string;
  id: string;
  name: string;
  role: Role;
  points: number;
  token?: string; // JWT token for authentication
}

export interface Question {
  id: string;
  questionText: string;
  type?: 'multiple-choice' | 'text';
  options: string[];
  correctAnswerIndex: number;
  correctTextAnswer?: string;
}

export interface Quiz {
  isPractice: unknown;
  _id: string;
  id: string;
  title: string;
  newAssignment: any;
  questionPool: Question[]; // Changed from 'questions' to 'questionPool'
  createdBy: 'AI' | 'MANUAL';
}

export interface QuizAssignment {
  id: string;
  _id: string;
  quizId: string;
  studentIds: string[]; // 'ALL' or array of user IDs
  deadline: string; // ISO string
  timeLimit?: number; // Optional time limit in minutes 
  numQuestionsToAssign: number; // How many questions to pull from the pool
  isLive: boolean; // Flag for live quizzes
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionIndex?: number;
  textAnswer?: string;
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
  _id: string;
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface DiscussionPost {
  id: string;
  _id: string;
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
