import React, { useState, useMemo, useEffect } from "react";
import {
  type User,
  type Quiz,
  type QuizResult,
  type Resource,
  type QuizAssignment,
  type DiscussionPost,
  Roles,
} from "../types";
import { db } from "../data/models";
import { usePersistentState } from "../hooks/usePersistentState";
import { startChat } from "../services/geminiService";
import { api } from "../services/api";
import type { Role } from "../types";
import axios from "axios";

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
  addQuiz: (
    quiz: Quiz,
    assignment: Omit<QuizAssignment, "id" | "quizId">
  ) => { newQuiz: Quiz; newAssignment: QuizAssignment };
  addResult: (result: QuizResult) => void;
  addResource: (resource: Resource) => void;
  removeUser: (userId: string) => void;
  updateUserPoints: (userId: string, points: number) => void;
  addPost: (
    postData: Omit<DiscussionPost, "id" | "createdAt" | "replies">
  ) => void;
  addReply: (
    postId: string,
    replyData: { authorId: string; content: string }
  ) => void;
}

const AppContext = React.createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within an AppProvider");
  return context;
};

// Helper function to normalize user data
const normalizeUser = (user: any): User => ({
  id: user._id || user.id,
  _id: user._id || user.id, // Keep _id for backend compatibility
  name: user.name,
  role: user.role,
  points: user.points ?? 0,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = usePersistentState<User | null>(
    "currentUser",
    null
  );
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [assignments, setAssignments] = useState<QuizAssignment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [discussionPosts, setDiscussionPosts] = useState<DiscussionPost[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Check backend health; if available, fetch from backend, otherwise fallback to local db
      const healthy = await api.health();
      if (!mounted) return;
      if (healthy) {
        setBackendAvailable(true);
        try {
          const [usersResp, quizzesResp, resourcesResp, postsResp] =
            await Promise.all([
              api.getUsers(),
              api.getQuizzes(),
              api.getResources(),
              api.getPosts(),
            ]);

          // normalize IDs (backend uses _id)
          const normUsers = (usersResp || []).map((u: any) => normalizeUser(u));
          const normQuizzes = (quizzesResp || []).map((q: any) => ({
            id: q._id || q.id,
            _id: q._id || q.id,
            title: q.title,
            questionPool: q.questionPool || [],
            createdBy: q.createdBy || q.createdBy,
          }));
          const normResources = (resourcesResp || []).map((r: any) => ({
            id: r._id || r.id,
            _id: r._id || r.id,
            title: r.title,
            content: r.content,
            type: r.type,
          }));
          const normPosts = (postsResp || []).map((p: any) => ({
            id: p._id || p.id,
            _id: p._id || p.id,
            title: p.title,
            content: p.content,
            authorId: p.authorId,
            createdAt: p.createdAt,
            replies: (p.replies || []).map((rep: any) => ({
              id: rep._id || rep.id,
              _id: rep._id || rep.id,
              authorId: rep.authorId,
              content: rep.content,
              createdAt: rep.createdAt,
            })),
          }));

          const resultsResp = await api.getResults().catch(() => []);
          const assignmentsResp = await api.getAssignments().catch(() => []);

          setUsers(normUsers);
          setQuizzes(normQuizzes);
          setResults(resultsResp || []);
          setAssignments(assignmentsResp || []);
          setResources(normResources);
          setDiscussionPosts(normPosts);
          setIsDataLoaded(true);
          return;
        } catch (err) {
          console.warn(
            "Failed to load remote data, falling back to local DB",
            err
          );
        }
      }

      // fallback to local DB
      const data = db.getAllData();
      if (!mounted) return;
      setUsers(data.users);
      setQuizzes(data.quizzes);
      setResults(data.results);
      setAssignments(data.assignments);
      setResources(data.resources);
      setDiscussionPosts(data.discussionPosts);
      setIsDataLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (user: any) => {
    console.log("Login user:", user);

    // Normalize the user object to ensure both id and _id exist
    const normalizedUser = normalizeUser(user.user || user);
    console.log("Normalized user:", normalizedUser);

    setCurrentUser(normalizedUser);

    if (normalizedUser.role === Roles.STUDENT) {
      startChat(); // Initialize chatbot on student login
    }
  };

  const logout = () => setCurrentUser(null);

  const addQuiz = async (
    quiz: Quiz,
    assignment: Omit<QuizAssignment, "id" | "quizId">
  ): Promise<{ newQuiz: Quiz; newAssignment: QuizAssignment }> => {
    const quizData = await axios.post("http://localhost:8080/api/create-quiz", {
      quiz,
      pool: quiz.questionPool,
      assignment,
    });
    console.log(quizData);
    const newQuiz = quizData.data.quiz;
    const newAssignment = quizData.data.assignment;
    return { newQuiz, newAssignment };
  };

  const addResult = async (result: QuizResult) => {
    console.log("Adding result for quiz:", result.quizId);
    const results = await axios.post(
      `http://localhost:8080/api/quizzes/${result.quizId}/submit`,
      {
        result,
      }
    );

    console.log("Result submitted:", results.data);
  };

  const updateUserPoints = (userId: string, points: number) => {
    const updatedUsers = db.updateUserPoints(userId, points);
    setUsers(updatedUsers);
  };

  const addResource = (resource: Resource) => {
    if (backendAvailable) {
      api
        .addResource(resource as any)
        .then((created: any) => {
          setResources((prev) => [
            ...prev,
            {
              ...resource,
              id: created._id || created.id,
              _id: created._id || created.id,
            },
          ]);
        })
        .catch(() => {
          const newResource = db.addResource(resource);
          setResources((prev) => [...prev, newResource]);
        });
      return;
    }
    const newResource = db.addResource(resource);
    setResources((prev) => [...prev, newResource]);
  };

  const removeUser = async (userId: string) => {
    const data = await axios.post("http://localhost:8080/api/delete", {
      userId,
    });
    console.log("User removed:", data);
    // Normalize the returned users
    const normalizedUsers = data.data.map((u: any) => normalizeUser(u));
    setUsers(normalizedUsers);
  };

  const addPost = (
    postData: Omit<DiscussionPost, "id" | "createdAt" | "replies">
  ) => {
    if (backendAvailable) {
      api
        .addPost(postData as any)
        .then((created: any) => {
          const mapped = {
            id: created._id || created.id,
            _id: created._id || created.id,
            title: created.title,
            content: created.content,
            authorId: created.authorId,
            createdAt: created.createdAt,
            replies: created.replies || [],
          } as DiscussionPost;
          setDiscussionPosts((prev) => [mapped, ...prev]);
        })
        .catch(() => {
          const updatedPosts = db.addPost(postData);
          setDiscussionPosts(updatedPosts);
        });
      return;
    }
    const updatedPosts = db.addPost(postData);
    setDiscussionPosts(updatedPosts);
  };

  const addReply = (
    postId: string,
    replyData: { authorId: string; content: string }
  ) => {
    if (backendAvailable) {
      api
        .addReply(postId, replyData as any)
        .then((created: any) => {
          // naive local append: refetch posts would be ideal; here we append reply locally
          setDiscussionPosts((prev) =>
            prev.map((p) =>
              p.id === postId || p._id === postId
                ? {
                    ...p,
                    replies: [
                      ...p.replies,
                      {
                        id: created._id || created.id,
                        _id: created._id || created.id,
                        authorId: created.authorId,
                        content: created.content,
                        createdAt: created.createdAt,
                      },
                    ],
                  }
                : p
            )
          );
        })
        .catch(() => {
          const updatedPosts = db.addReply(postId, replyData);
          setDiscussionPosts(updatedPosts);
        });
      return;
    }
    const updatedPosts = db.addReply(postId, replyData);
    setDiscussionPosts(updatedPosts);
  };

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser._id || currentUser.id;
      const updatedCurrentUser = users.find((u) => (u.id || u._id) === userId);
      if (
        updatedCurrentUser &&
        updatedCurrentUser.points !== currentUser.points
      ) {
        setCurrentUser(normalizeUser(updatedCurrentUser));
      }
    }
  }, [users, currentUser]);

  const contextValue = useMemo(
    () => ({
      currentUser,
      login,
      logout,
      users,
      quizzes,
      results,
      assignments,
      resources,
      discussionPosts,
      addQuiz,
      addResult,
      addResource,
      removeUser,
      updateUserPoints,
      addPost,
      addReply,
    }),
    [
      currentUser,
      users,
      quizzes,
      results,
      assignments,
      resources,
      discussionPosts,
    ]
  );

  if (!isDataLoaded) {
    return null;
  }

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
