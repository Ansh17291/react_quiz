import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { StatCard } from "../../features/dashboard/StatCard";
import { ContributionHeatmap } from "../../features/dashboard/ContributionHeatmap";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import { Button, Card } from "../../components/ui";
import {
  CalendarIcon,
  UserGroupIcon,
  TrophyIcon,
  ChartBarIcon,
  BookOpenIcon,
} from "../../components/Icons";
import { api } from "../../services/api";
import io from "socket.io-client";
import { useToast } from "../../components/ui";

const StudentDashboard = () => {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [, setAssignments] = React.useState<any[]>([]);
  const [studentAssignments, setStudentAssignments] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [quizzes, setQuizzes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Get the correct user ID (handle both _id and id)
  const currentUserId = currentUser?._id || currentUser?.id;

  const studentResults = React.useMemo(() => {
    return results.filter((r) => r.userId === currentUserId);
  }, [results, currentUserId]);

  const avgScore = React.useMemo(() => {
    return studentResults.length > 0
      ? Math.round(
          studentResults.reduce((acc, r) => acc + r.score, 0) /
            studentResults.length
        )
      : "N/A";
  }, [studentResults]);

  const overallRank = React.useMemo(() => {
    if (!currentUserId || users.length === 0) return "N/A";
    return (
      users
        .filter((u) => u.role === "STUDENT")
        .sort((a, b) => b.points - a.points)
        .findIndex((u) => (u._id || u.id) === currentUserId) + 1
    );
  }, [users, currentUserId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel via shared API
        const [usersRes, assignmentsRes, quizzesRes, resultsRes] =
          await Promise.all([
            api.getUsers(),
            api.getAssignments(),
            api.getQuizzes(),
            api.getResults(),
          ]);

        // Update state with the fetched data
        setUsers(usersRes || []);
        setQuizzes(quizzesRes || []);
        setResults(resultsRes || []);
        setAssignments(assignmentsRes || []);

        // Filter assignments for the current student
        const studentAssignmentsData = (assignmentsRes || []).filter((a: any) =>
          a.studentIds.includes(currentUserId)
        );

        setStudentAssignments(studentAssignmentsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUserId) {
      fetchData();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const socket = io("/assignments");

    socket.on("connect", () => {
      console.log("Connected to assignments websocket");
    });

    socket.on("newAssignment", async (newAssignment) => {
      if (newAssignment.studentIds.includes(currentUserId)) {
        setStudentAssignments((prev) => {
          const assignmentExists = prev.some(
            (assignment) => assignment._id === newAssignment._id
          );
          if (!assignmentExists) {
            addToast("A new quiz has been assigned to you!", "info");
            return [...prev, newAssignment];
          }
          return prev;
        });
        // Fetch quizzes again to get the new quiz title
        const quizzesRes = await api.getQuizzes();
        setQuizzes(quizzesRes || []);
      }
    });

    socket.on("deassignQuiz", ({ quizId, studentIds }) => {
      if (studentIds.includes(currentUserId)) {
        addToast("A quiz has been unassigned.", "info");
        setStudentAssignments((prev) =>
          prev.filter((assignment) => assignment.quizId !== quizId)
        );
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from assignments websocket");
    });

    socket.on("connect_error", (err) => {
      console.error("Assignments websocket connection error:", err);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, addToast]);

  return (
    <AnimatedWrapper className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">
          Welcome back, {currentUser?.name}!
        </h2>
        <p className="text-slate-400">Ready to conquer some quizzes today?</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-xl font-semibold mb-4">Assigned Quizzes</h3>
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-red-400 bg-red-500/20 rounded-lg">
                {error}
              </div>
            ) : studentAssignments.length > 0 ? (
              <StaggeredList className="space-y-3">
                {studentAssignments.map((assignment) => {
                  const quiz = quizzes.find((q) => q._id === assignment.quizId);
                  const isTaken = studentResults.some(
                    (r) => r.quizId === quiz?._id
                  );
                  const isExpired = new Date(assignment.deadline) < new Date();
                  if (!quiz) return null;
                  return (
                    <div
                      key={assignment._id || assignment.id}
                      className="p-4 bg-slate-700/50 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors duration-150 ease-out hover:scale-[1.01]"
                    >
                      <div>
                        <p className="font-semibold text-lg">
                          {quiz.title}{" "}
                          {assignment.isLive && (
                            <span className="text-xs font-medium text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full ml-2">
                              LIVE
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                          <CalendarIcon className="w-4 h-4" /> Deadline:{" "}
                          {new Date(assignment.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      {isTaken ? (
                        <Button
                          onClick={() => navigate(`/results/${quiz._id}`)}
                          variant="secondary"
                        >
                          Review
                        </Button>
                      ) : isExpired ? (
                        <span className="px-3 py-1 text-xs font-semibold text-red-200 bg-red-800 rounded-full">
                          Expired
                        </span>
                      ) : (
                        <Button
                          onClick={() => {
                            navigate(`/quiz/${assignment._id}`);
                          }}
                        >
                          {assignment.isLive ? "Join Live Quiz" : "Start Quiz"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </StaggeredList>
            ) : (
              <p className="text-slate-400 text-center py-4">
                No quizzes assigned yet. Check back later!
              </p>
            )}
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-4">Your Activity</h3>
            <ContributionHeatmap results={studentResults} />
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="text-xl font-semibold mb-4 text-center">
              Your Stats
            </h3>
            <div className="space-y-4">
              <StatCard
                label="Total Points"
                value={currentUser!.points}
                icon={<TrophyIcon />}
              />
              <StatCard
                label="Overall Rank"
                value={`#${overallRank}`}
                icon={<UserGroupIcon />}
              />
              <StatCard
                label="Average Score"
                value={avgScore === "N/A" ? "N/A" : `${avgScore}%`}
                icon={<ChartBarIcon />}
              />
            </div>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  // Use the correct ID field
                  navigate(`/student/${currentUserId}`);
                }}
                variant="secondary"
                className="w-full"
              >
                <UserGroupIcon className="w-5 h-5" /> My Profile
              </Button>
              <Button
                onClick={() => navigate("/discussions")}
                variant="secondary"
                className="w-full"
              >
                <UserGroupIcon className="w-5 h-5" /> Discussions
              </Button>
              <Button
                onClick={() => navigate("/resources")}
                variant="secondary"
                className="w-full"
              >
                <BookOpenIcon className="w-5 h-5" /> Resources
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AnimatedWrapper>
  );
};

export default StudentDashboard;
