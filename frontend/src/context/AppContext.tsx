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
// removed local DB usage
import { usePersistentState } from "../hooks/usePersistentState";
import { startChat } from "../services/geminiService";
import { api, BASE } from "../services/api";
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
    assignment: Omit<QuizAssignment, "id" | "quizId" | "_id">
  ) => Promise<{ newQuiz: Quiz; newAssignment: QuizAssignment }>;
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
  const [, setBackendAvailable] = useState(false);

  // Calculate total points for a user from results
  const calculateUserPoints = (
    userId: string,
    allResults: QuizResult[]
  ): number => {
    return (allResults || [])
      .filter((r) => r.userId === userId)
      .reduce((sum, r) => sum + (r.score || 0), 0);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Always fetch from backend; no local DB fallback
      const healthy = await api.health();
      if (!mounted) return;
      setBackendAvailable(!!healthy);
      try {
        const [
          usersResp,
          quizzesResp,
          resourcesResp,
          postsResp,
          resultsResp,
          assignmentsResp,
        ] = await Promise.all([
          api.getUsers(),
          api.getQuizzes(),
          api.getResources(),
          api.getPosts(),
          api.getResults(),
          api.getAssignments(),
        ]);

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

        const resultsList = resultsResp || [];
        // Derive points from results to keep UI consistent
        const usersWithPoints = normUsers.map((u: User) => ({
          ...u,
          points: calculateUserPoints(u._id || u.id, resultsList),
        }));

        setUsers(usersWithPoints);
        setQuizzes(normQuizzes);
        setResults(resultsList);
        setAssignments(assignmentsResp || []);
        setResources(normResources);
        setDiscussionPosts(normPosts);
        setIsDataLoaded(true);
      } catch (err) {
        console.error("Failed to load data from backend:", err);
        setIsDataLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (user: any) => {
    
    const normalizedUser = normalizeUser(user.user || user);
    

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
    const quizData = await axios.post(`${BASE}/api/create-quiz`, {
      quiz,
      pool: quiz.questionPool,
      assignment,
    });
   
    const newQuiz = quizData.data.quiz;
    const newAssignment = quizData.data.assignment;
    return { newQuiz, newAssignment };
  };

  const addResult = async (result: QuizResult) => {
   
    const results = await axios.post(
      `${BASE}/api/quizzes/${result.quizId}/submit`,
      {
        result,
      }
    );

    
    // Optimistically update results; points will be recalculated in the effect below
    setResults((prev) => [...prev, results.data || result]);
  };

  const updateUserPoints = (userId: string, points: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId || u._id === userId ? { ...u, points } : u
      )
    );
  };

  const addResource = (resource: Resource) => {
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
      .catch((err) => {
        console.error("Failed to add resource:", err);
      });
  };

  const removeUser = async (userId: string) => {
    const data=  await axios.post(`${BASE}/api/delete`, {
      userId,
    });
   
console.log(data.data);
    // Normalize the returned users
    const normalizedUsers = data.data.map((u: any) => normalizeUser(u));
    setUsers(normalizedUsers);
  };

  const addPost = (
    postData: Omit<DiscussionPost, "id" | "createdAt" | "replies">
  ) => {
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
      .catch((err) => {
        console.error("Failed to add post:", err);
      });
  };

  const addReply = async (
    postId: string,
    replyData: { authorId: string; content: string }
  ) => {
    const optimistic = {
      authorId: replyData.authorId,
      content: replyData.content,
      createdAt: new Date().toISOString(),
      id: postId,
    };
   

    await axios.post(
      "/api/discussions/reply",
      {
        optimistic: {
          postId,
          ...optimistic,
        },
      }
    );

   

    // Optimistic UI update
    // setDiscussionPosts((prev) =>
    //   prev.map((p) =>
    //     p.id === postId || p._id === postId
    //       ? { ...p, replies: [...p.replies, optimistic] }
    //       : p
    //   )
    // );

    api
      .addReply(postId, replyData as any)
      .then((created: any) => {
        // Replace optimistic reply with server one
        setDiscussionPosts((prev) =>
          prev.map((p) => {
            if (!(p.id === postId || p._id === postId)) return p;
            const replies = p.replies.slice();
            const idx = replies.findIndex((r: any) => r.id === optimistic.id);
            const serverReply = {
              id: created._id || created.id,
              _id: created._id || created.id,
              authorId: created.authorId,
              content: created.content,
              createdAt: created.createdAt,
            };
            if (idx >= 0) replies[idx] = serverReply;
            else replies.push(serverReply);
            return { ...p, replies };
          })
        );
      })
      .catch((err) => {
        console.error("Failed to add reply:", err);
        // keep optimistic reply; optionally mark unsynced
      });
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

  // Keep user points in sync with results
  useEffect(() => {
    if (users.length === 0) return;
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        points: calculateUserPoints(u._id || u.id, results),
      }))
    );
  }, [results]);

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
