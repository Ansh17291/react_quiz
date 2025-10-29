import { type User, type Quiz, type QuizResult, type QuizAssignment, type Resource, type Role, type DiscussionPost, type DiscussionReply, Roles } from '../types';

// --- MOCK DATA (Initial seed for the database) ---

const mockInitialUsers: User[] = [
    { id: 'user-1', name: 'Alice', role: Roles.STUDENT, points: 50 },
    { id: 'user-2', name: 'Bob', role: Roles.STUDENT, points: 20 },
    { id: 'user-3', name: 'Charlie', role: Roles.STUDENT, points: 75 },
    { id: 'user-admin', name: 'Admin', role: Roles.ADMIN, points: 0 },
    { id: 'user-teacher', name: 'Teacher', role: Roles.TEACHER, points: 0 },
];

const mockInitialQuizzes: Quiz[] = [
    {
        id: 'quiz-1',
        title: 'React Fundamentals',
        questionPool: [
            { id: 'q-1-1', questionText: 'What is JSX?', options: ['A JavaScript syntax extension', 'A CSS preprocessor', 'A database query language', 'A state management library'], correctAnswerIndex: 0 },
            { id: 'q-1-2', questionText: 'Which hook is used to perform side effects in a function component?', options: ['useState', 'useReducer', 'useEffect', 'useContext'], correctAnswerIndex: 2 },
            { id: 'q-1-3', questionText: 'What does `useState` return?', options: ['A single value', 'An object with a value and a setter', 'An array with a value and a setter function', 'A function'], correctAnswerIndex: 2 },
            { id: 'q-1-4', questionText: 'How do you pass data from a parent component to a child component?', options: ['State', 'Props', 'Context', 'Redux'], correctAnswerIndex: 1 },
        ],
        createdBy: 'MANUAL',
    },
     {
        id: 'quiz-2',
        title: 'Basic Math',
        questionPool: [
            { id: 'q-2-1', questionText: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctAnswerIndex: 1 },
            { id: 'q-2-2', questionText: 'What is 10 * 5?', options: ['40', '45', '50', '55'], correctAnswerIndex: 2 },
            { id: 'q-2-3', questionText: 'What is 100 / 4?', options: ['20', '25', '30', '35'], correctAnswerIndex: 1 },
            { id: 'q-2-4', questionText: 'What is the square root of 81?', options: ['7', '8', '9', '10'], correctAnswerIndex: 2 },
            { id: 'q-2-5', questionText: 'What is 3 cubed (3^3)?', options: ['9', '12', '27', '30'], correctAnswerIndex: 2 },
        ],
        createdBy: 'MANUAL',
    }
];

const mockInitialAssignments: QuizAssignment[] = [
    { id: 'assign-1', quizId: 'quiz-1', studentIds: ['user-1', 'user-2', 'user-3'], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), numQuestionsToAssign: 2, isLive: false, timeLimit: 5 },
    { id: 'assign-2', quizId: 'quiz-2', studentIds: ['user-1', 'user-2'], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), numQuestionsToAssign: 3, isLive: false, timeLimit: 3 }
];

const mockInitialResults: QuizResult[] = [
    { 
        quizId: 'quiz-1', 
        userId: 'user-1', 
        score: 50, 
        answers: [
            { questionId: 'q-1-1', selectedOptionIndex: 0, isCorrect: true },
            { questionId: 'q-1-2', selectedOptionIndex: 1, isCorrect: false },
        ],
        timeTaken: 120,
        submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // submitted yesterday
    },
    { 
        quizId: 'quiz-2', 
        userId: 'user-2', 
        score: 100, 
        answers: [
            { questionId: 'q-2-1', selectedOptionIndex: 1, isCorrect: true },
            { questionId: 'q-2-2', selectedOptionIndex: 2, isCorrect: true },
            { questionId: 'q-2-3', selectedOptionIndex: 1, isCorrect: true },
        ],
        timeTaken: 60,
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // submitted 2 days ago
    }
];

const mockInitialDiscussionPosts: DiscussionPost[] = [
    {
        id: 'post-1',
        title: 'Confused about useEffect dependencies',
        content: 'I\'m having trouble understanding when to include functions in the dependency array for useEffect. Can someone explain the best practices? I keep getting infinite loops!',
        authorId: 'user-1', // Alice
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        replies: [
            {
                id: 'reply-1-1',
                authorId: 'user-3', // Charlie
                content: 'Great question! A common mistake is not wrapping the function in `useCallback`. If the function is defined inside your component, it gets recreated on every render. If you pass it as a dependency, it causes an infinite loop. `useCallback` memoizes the function so it only changes when its own dependencies change.',
                createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            }
        ]
    },
    {
        id: 'post-2',
        title: 'Tips for the Basic Math quiz?',
        content: 'Does anyone have any tips for the math quiz? I want to make sure I get a good score.',
        authorId: 'user-2', // Bob
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // yesterday
        replies: []
    }
];

// --- DATABASE ABSTRACTION LAYER ---

const DB_KEY = 'intelliQuizDB';

interface DatabaseSchema {
    users: User[];
    quizzes: Quiz[];
    results: QuizResult[];
    assignments: QuizAssignment[];
    resources: Resource[];
    discussionPosts: DiscussionPost[];
}

const getDB = (): DatabaseSchema => {
    try {
        const dbString = localStorage.getItem(DB_KEY);
        if (dbString) {
            // Revive date strings into Date objects
            return JSON.parse(dbString, (key, value) => {
                 if ((key === 'submittedAt' || key === 'deadline' || key === 'createdAt') && value) {
                    return new Date(value);
                }
                return value;
            });
        }
    } catch (error) {
        console.error("Failed to read from localStorage", error);
    }
    // If DB doesn't exist, create it with mock data
    const initialDB: DatabaseSchema = {
        users: mockInitialUsers,
        quizzes: mockInitialQuizzes,
        results: mockInitialResults,
        assignments: mockInitialAssignments,
        resources: [],
        discussionPosts: mockInitialDiscussionPosts,
    };
    localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
    return initialDB;
};

const saveDB = (db: DatabaseSchema) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Failed to save to localStorage", error);
    }
};

// --- EXPORTED MODEL FUNCTIONS ---

export const db = {
    getAllData: (): DatabaseSchema => {
        return getDB();
    },

    addUser: (userData: { name: string; role: Role }): User => {
        const currentDB = getDB();
        const newUser: User = {
            id: `user-${Date.now()}`,
            name: userData.name,
            role: userData.role,
            points: 0,
        };
        currentDB.users.push(newUser);
        saveDB(currentDB);
        return newUser;
    },

    removeUser: (userId: string): User[] => {
        const currentDB = getDB();
        currentDB.users = currentDB.users.filter(u => u.id !== userId);
        saveDB(currentDB);
        return currentDB.users;
    },
    
    updateUserPoints: (userId: string, points: number): User[] => {
        const currentDB = getDB();
        const userIndex = currentDB.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            currentDB.users[userIndex].points += points;
        }
        saveDB(currentDB);
        return currentDB.users;
    },

    addQuiz: (quiz: Quiz, assignment: Omit<QuizAssignment, 'id' | 'quizId'>): { newQuiz: Quiz, newAssignment: QuizAssignment } => {
        const currentDB = getDB();
        const newAssignment: QuizAssignment = { ...assignment, id: `assign-${Date.now()}`, quizId: quiz.id };
        
        currentDB.quizzes.push(quiz);
        currentDB.assignments.push(newAssignment);
        
        saveDB(currentDB);
        return { newQuiz: quiz, newAssignment };
    },
    
    addResult: (result: QuizResult): QuizResult[] => {
        const currentDB = getDB();
        // Prevent duplicate results for the same quiz by the same user
        const existingResultIndex = currentDB.results.findIndex(r => r.quizId === result.quizId && r.userId === result.userId);
        if (existingResultIndex !== -1) {
            currentDB.results[existingResultIndex] = result;
        } else {
            currentDB.results.push(result);
        }
        saveDB(currentDB);
        return currentDB.results;
    },
    
    addResource: (resource: Resource): Resource => {
        const currentDB = getDB();
        // Avoid adding duplicate resources by title
        if (!currentDB.resources.some(r => r.title === resource.title)) {
            currentDB.resources.push(resource);
            saveDB(currentDB);
        }
        return resource;
    },

    addPost: (postData: Omit<DiscussionPost, 'id' | 'createdAt' | 'replies'>): DiscussionPost[] => {
        const currentDB = getDB();
        const newPost: DiscussionPost = {
            ...postData,
            id: `post-${Date.now()}`,
            createdAt: new Date(),
            replies: [],
        };
        currentDB.discussionPosts.unshift(newPost); // Add to the top of the list
        saveDB(currentDB);
        return currentDB.discussionPosts;
    },

    addReply: (postId: string, replyData: Omit<DiscussionReply, 'id' | 'createdAt'>): DiscussionPost[] => {
        const currentDB = getDB();
        const postIndex = currentDB.discussionPosts.findIndex(p => p.id === postId);
        if (postIndex !== -1) {
            const newReply: DiscussionReply = {
                ...replyData,
                id: `reply-${Date.now()}`,
                createdAt: new Date(),
            };
            currentDB.discussionPosts[postIndex].replies.push(newReply);
            saveDB(currentDB);
        }
        return currentDB.discussionPosts;
    }
};
