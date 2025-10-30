import { type QuizAssignment, type Resource, type DiscussionPost, type DiscussionReply } from '../types';

// --- MOCK DATA (Initial seed for the database) ---


const mockInitialAssignments: QuizAssignment[] = [
    { id: 'assign-1', quizId: 'quiz-1', studentIds: ['user-1', 'user-2', 'user-3'], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), numQuestionsToAssign: 2, isLive: false, timeLimit: 5 },
    { id: 'assign-2', quizId: 'quiz-2', studentIds: ['user-1', 'user-2'], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), numQuestionsToAssign: 3, isLive: false, timeLimit: 3 }
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
