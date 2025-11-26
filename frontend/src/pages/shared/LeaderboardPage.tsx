import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import { Card, Tabs, useToast } from "../../components/ui";
import { TrophyIcon } from "../../components/Icons";
import io from "socket.io-client";

const LeaderboardPage = () => {
  const { addToast } = useToast();
  const { quizId } = useParams<{ quizId?: string }>();
  const { users, quizzes, results } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(quizId ? "By Quiz" : "Overall");
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(
    quizId || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallLeaderboard, setOverallLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const socket = io("/leaderboard");

    socket.on("connect", () => {
      setLoading(false);
    });

    socket.on("initialData", (data) => {
      setOverallLeaderboard(data);
    });

    socket.on("update", (data) => {
      addToast("Leaderboard has been updated!", "info");
      setOverallLeaderboard(data);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from leaderboard websocket");
    });

    socket.on("connect_error", (err) => {
      console.error("Leaderboard websocket connection error:", err);
      setError("Failed to connect to real-time leaderboard updates.");
      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [addToast]);

  const rankBadges = ["🥇", "🥈", "🥉"];

  // Calculate quiz statistics
  const quizStats = useMemo(() => {
    if (!selectedQuizId || !results.length) return null;

    const quizResults = results.filter((r) => r.quizId === selectedQuizId);
    if (!quizResults.length) return null;

    const scores = quizResults.map((r) => r.score);
    return {
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      totalAttempts: quizResults.length,
    };
  }, [results, selectedQuizId]);

  const quizLeaderboard = useMemo(() => {
    if (!selectedQuizId) return [];
    const studentUsers = (users || []).filter((u) => u.role === "STUDENT");
    return results
      .filter((r) => r.quizId === selectedQuizId)
      .sort((a, b) => {
        // First sort by score
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Then by time taken (faster completion is better)
        return (a.timeTaken || 0) - (b.timeTaken || 0);
      })
      .map((result) => {
        const user = studentUsers.find(
          (u) => (u._id || (u as any).id) === result.userId
        );
        return {
          user,
          result,
          rank: 0, // Will be set based on position
        };
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [results, users, selectedQuizId]);
  const selectedQuiz = quizzes.find((q) => q._id === selectedQuizId);

  const handleQuizSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuizId = e.target.value;
    setSelectedQuizId(newQuizId);
    setActiveTab("By Quiz");
    navigate(newQuizId ? `/leaderboard/${newQuizId}` : "/leaderboard");
  };

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Leaderboards</h2>
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card>
          <Tabs
            tabs={["Overall", "By Quiz"]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <div className="mt-6">
            {activeTab === "Overall" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Overall Student Rankings (by Points)
                </h3>
                <StaggeredList className="space-y-2">
                  {overallLeaderboard.map((student, index) => (
                    <div
                      key={student._id}
                      className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-transform duration-150 ease-out hover:scale-[1.01]"
                    >
                      <span className="font-medium text-lg flex items-center gap-3">
                        <span
                          className={`text-xl w-6 text-center ${
                            index < 3 ? "" : "text-slate-400"
                          }`}
                        >
                          {rankBadges[index] || index + 1}
                        </span>
                        <button
                          className="underline text-primary-300 hover:text-primary-200"
                          onClick={() => {
                            if (student._id) {
                              addToast(
                                `Viewing ${student.name}'s profile`,
                                "info"
                              );
                              navigate(`/student/${student._id}`);
                            }
                          }}
                        >
                          {student.name}
                        </button>
                      </span>
                      <span className="font-bold text-yellow-400 text-lg flex items-center gap-1">
                        <TrophyIcon className="w-5 h-5" />
                        {student.points}
                      </span>
                    </div>
                  ))}
                </StaggeredList>
              </div>
            )}
            {activeTab === "By Quiz" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Quiz-Specific Rankings
                </h3>
                <select
                  onChange={handleQuizSelection}
                  value={selectedQuizId || ""}
                  className="w-full p-2 mb-4 border rounded-md bg-slate-700 border-slate-600"
                >
                  <option value="">-- Select a Quiz --</option>
                  {quizzes
                    .filter((q) => !q.isPractice)
                    .map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.title}
                      </option>
                    ))}
                </select>

                {selectedQuizId && (
                  <>
                    <div className="mb-6">
                      <h4 className="text-lg font-bold mb-2">
                        Results for: {selectedQuiz?.title}
                      </h4>
                      {quizStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <p className="text-sm text-slate-400">
                              Average Score
                            </p>
                            <p className="text-xl font-bold">
                              {quizStats.avgScore.toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <p className="text-sm text-slate-400">
                              Highest Score
                            </p>
                            <p className="text-xl font-bold text-green-400">
                              {quizStats.maxScore}%
                            </p>
                          </div>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <p className="text-sm text-slate-400">
                              Lowest Score
                            </p>
                            <p className="text-xl font-bold text-yellow-400">
                              {quizStats.minScore}%
                            </p>
                          </div>
                          <div className="bg-slate-700/30 p-3 rounded-lg">
                            <p className="text-sm text-slate-400">
                              Total Attempts
                            </p>
                            <p className="text-xl font-bold">
                              {quizStats.totalAttempts}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {quizLeaderboard.length > 0 ? (
                      <StaggeredList className="space-y-2">
                        {quizLeaderboard.map(({ user, result, rank }) => (
                          <div
                            key={user?._id}
                            className={`flex justify-between items-center p-3 rounded-lg ${
                              rank <= 3 ? "bg-slate-600/50" : "bg-slate-700/50"
                            }`}
                          >
                            <span className="font-medium flex items-center gap-3">
                              <span
                                className={`text-xl w-6 text-center ${
                                  rank <= 3
                                    ? "text-yellow-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {rank <= 3 ? rankBadges[rank - 1] : rank}
                              </span>
                              <button
                                className="underline text-primary-300 hover:text-primary-200"
                                onClick={() =>
                                  user?._id && navigate(`/student/${user._id}`)
                                }
                              >
                                {user?.name || "Unknown Student"}
                              </button>
                            </span>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-primary-400 text-lg">
                                  {result.score}%
                                </span>
                                <span className="text-xs text-slate-400">
                                  {Math.floor(result.timeTaken / 60)}m{" "}
                                  {result.timeTaken % 60}s
                                </span>
                              </div>
                              <TrophyIcon
                                className={`w-5 h-5 ${
                                  rank === 1
                                    ? "text-yellow-400"
                                    : rank === 2
                                    ? "text-slate-300"
                                    : rank === 3
                                    ? "text-amber-600"
                                    : "hidden"
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </StaggeredList>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-400 mb-2">
                          No results yet for this quiz
                        </p>
                        <p className="text-sm text-slate-500">
                          Students haven't attempted this quiz yet
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </AnimatedWrapper>
  );
};

export default LeaderboardPage;
