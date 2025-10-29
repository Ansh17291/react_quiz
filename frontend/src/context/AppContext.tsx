import React, { useState, useMemo, useEffect } from 'react';
import { type User, type Quiz, type QuizResult, type Resource, type QuizAssignment, type DiscussionPost, type ChatMessage, Roles } from '../types';
import { db } from '../data/models';
import { usePersistentState } from '../hooks/usePersistentState';
import { startChat } from '../services/geminiService';
import type { Role } from '../types';

// --- APP CONTEXT ---
interface AppContextType {
    currentUser: User | null;
    login: (user: User) => void;
    logout: () => void;
    users: User[];
    quizzes: Quiz[];
    results: QuizResult[];
    assignments: QuizAssignment[];
    resources: Resource[];
    discussionPosts: DiscussionPost[];
    addQuiz: (quiz: Quiz, assignment: Omit<QuizAssignment, 'id' | 'quizId'>) => { newQuiz: Quiz, newAssignment: QuizAssignment };
    addResult: (result: QuizResult) => void;
    addResource: (resource: Resource) => void;
    removeUser: (userId: string) => void;
    updateUserPoints: (userId: string, points: number) => void;
    addUser: (userData: { name: string; role: Role }) => User;
    addPost: (postData: Omit<DiscussionPost, 'id' | 'createdAt' | 'replies'>) => void;
    addReply: (postId: string, replyData: { authorId: string; content: string; }) => void;
}

const AppContext = React.createContext<AppContextType | null>(null);

export const useAppContext = () => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = usePersistentState<User | null>('currentUser', null);
    const [users, setUsers] = useState<User[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [results, setResults] = useState<QuizResult[]>([]);
    const [assignments, setAssignments] = useState<QuizAssignment[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [discussionPosts, setDiscussionPosts] = useState<DiscussionPost[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    useEffect(() => {
        const data = db.getAllData();
        setUsers(data.users);
        setQuizzes(data.quizzes);
        setResults(data.results);
        setAssignments(data.assignments);
        setResources(data.resources);
        setDiscussionPosts(data.discussionPosts);
        setIsDataLoaded(true);
    }, []);

    const login = (user: User) => {
        const latestUser = db.getAllData().users.find(u => u.id === user.id) || user;
        setCurrentUser(latestUser);
        if (latestUser.role === Roles.STUDENT) {
            startChat(); // Initialize chatbot on student login
        }
    };
    const logout = () => setCurrentUser(null);
    
    const addQuiz = (quiz: Quiz, assignment: Omit<QuizAssignment, 'id' | 'quizId'>): { newQuiz: Quiz, newAssignment: QuizAssignment } => {
        const { newQuiz, newAssignment } = db.addQuiz(quiz, assignment);
        setQuizzes(prev => [...prev, newQuiz]);
        setAssignments(prev => [...prev, newAssignment]);
        return { newQuiz, newAssignment };
    };

    const addResult = (result: QuizResult) => {
        const updatedResults = db.addResult(result);
        setResults(updatedResults);
        
        // Award points
        const quizResults = updatedResults.filter(r => r.quizId === result.quizId);
        const sortedResults = quizResults.sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);
        const top3 = sortedResults.slice(0, 3);
        
        const rank = top3.findIndex(r => r.userId === result.userId);
        if (rank !== -1) {
            const pointsToAdd = [10, 5, 2][rank];
            updateUserPoints(result.userId, pointsToAdd);
        }
    };
    
    const updateUserPoints = (userId: string, points: number) => {
        const updatedUsers = db.updateUserPoints(userId, points);
        setUsers(updatedUsers);
    };

    const addResource = (resource: Resource) => {
        const newResource = db.addResource(resource);
        setResources(prev => [...prev, newResource]);
    };

    const removeUser = (userId: string) => {
        const updatedUsers = db.removeUser(userId);
        setUsers(updatedUsers);
    };

    const addUser = (userData: { name: string; role: Role }): User => {
        const newUser = db.addUser(userData);
        setUsers(prev => [...prev, newUser]);
        return newUser;
    };
    
    const addPost = (postData: Omit<DiscussionPost, 'id' | 'createdAt' | 'replies'>) => {
        const updatedPosts = db.addPost(postData);
        setDiscussionPosts(updatedPosts);
    };

    const addReply = (postId: string, replyData: { authorId: string; content: string; }) => {
        const updatedPosts = db.addReply(postId, replyData);
        setDiscussionPosts(updatedPosts);
    };

    useEffect(() => {
        if (currentUser) {
            const updatedCurrentUser = users.find(u => u.id === currentUser.id);
            if (updatedCurrentUser && updatedCurrentUser.points !== currentUser.points) {
                setCurrentUser(updatedCurrentUser);
            }
        }
    }, [users, currentUser]);

    const contextValue = useMemo(() => ({ 
        currentUser, login, logout, users, quizzes, results, assignments, resources, discussionPosts,
        addQuiz, addResult, addResource, removeUser, updateUserPoints, addUser, addPost, addReply
    }), [currentUser, users, quizzes, results, assignments, resources, discussionPosts]);

    if (!isDataLoaded) {
        // You might want a better loading state here, but for now, it prevents rendering children
        return null;
    }

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};
