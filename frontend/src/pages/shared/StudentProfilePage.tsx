import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { ContributionHeatmap } from "../../features/dashboard/ContributionHeatmap";
import { Card } from "../../components/ui";
import { api } from "../../services/api";

const StudentProfilePage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  useAppContext();

  const [student, setStudent] = useState<any>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [studentPosts, setStudentPosts] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  const [grade, setGrade] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch student data
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        // Some backends may not expose /users/:id; fetch all and find client-side
        const users = await api.getUsers();
        const found = (users || []).find(
          (u: any) => (u._id || u.id) === studentId
        );
        setStudent(found || null);
      } catch (error) {
        console.error("Failed to fetch student:", error);
      }
    };

    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  // Fetch student results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const results = await api.getResults();
        const userResults = (results || []).filter(
          (r: any) => String(r.userId) === String(studentId)
        );
        const sortedResults = userResults.sort(
          (a: any, b: any) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );
        setStudentResults(sortedResults);
      } catch (error) {
        console.error("Failed to fetch results:", error);
        setStudentResults([]);
      }
    };

    if (studentId) {
      fetchResults();
    }
  }, [studentId]);

  // Fetch student discussion posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const posts = await api.getPosts();
        const userPosts = (posts || []).filter(
          (p: any) => p.authorId === studentId
        );
        const sortedPosts = userPosts
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5); // Get last 5 posts
        setStudentPosts(sortedPosts);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setStudentPosts([]);
      }
    };

    if (studentId) {
      fetchPosts();
    }
  }, [studentId]);

  // Fetch quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await api.getQuizzes();
        setQuizzes(response || []);
      } catch (error) {
        console.error("Failed to fetch quizzes:", error);
      }
    };

    fetchQuizzes();
  }, []);

  // Calculate strengths, weaknesses, and grade
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);

  useEffect(() => {
    if (!student || quizzes.length === 0) {
      if (student) setIsLoading(false);
      return;
    }

    // Prefer stored strengths and weaknesses if they exist
    if (student.strengths && student.strengths.length > 0) {
      setStrengths(student.strengths);
      setWeaknesses(student.weaknesses || []);

      // Still need to calculate grade
      if (studentResults.length > 0) {
        const calculatedGrade = Math.round(
          studentResults.reduce((acc, r) => acc + r.score, 0) /
          studentResults.length
        );
        setGrade(calculatedGrade);
      }

      setIsLoading(false);
      return;
    }

    if (studentResults.length === 0) {
      setGrade(0);
      setStrengths([]);
      setWeaknesses([]);
      setIsLoading(false);
      return;
    }

    const calculatedGrade = Math.round(
      studentResults.reduce((acc, r) => acc + r.score, 0) /
      studentResults.length
    );
    setGrade(calculatedGrade);

    const topicStats: Record<string, { totalScore: number; count: number }> = {};

    studentResults.forEach((res) => {
      const quiz = quizzes.find(
        (q) => String(q._id) === String(res.quizId) || String(q.id) === String(res.quizId)
      );
      if (quiz) {
        const category = quiz.category || "General";
        if (!topicStats[category]) {
          topicStats[category] = { totalScore: 0, count: 0 };
        }
        topicStats[category].totalScore += res.score;
        topicStats[category].count += 1;
      }
    });

    const s: string[] = [];
    const w: string[] = [];

    Object.entries(topicStats).forEach(([category, stats]) => {
      const avg = stats.totalScore / stats.count;
      if (avg >= 50) {
        s.push(category);
      } else {
        w.push(category);
      }
    });

    setStrengths(s);
    setWeaknesses(w);
    setIsLoading(false);
  }, [student, studentResults, quizzes]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!student) {
    return <div>Student not found.</div>;
  }

  const gradeColor =
    grade > 80
      ? "text-green-400"
      : grade > 60
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <Card>
        <div className="text-center">
          <h2 className="text-4xl font-bold">{student.name}</h2>
          <p className="text-2xl font-bold mt-2">
            Overall Grade: <span className={gradeColor}>{grade}/100</span>
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-green-500">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="p-1 bg-green-500/20 rounded text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
            Strengths
          </h3>
          <div className="flex flex-wrap gap-2">
            {strengths.length > 0 ? (
              strengths.map((s) => (
                <span key={s} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium border border-green-500/20">
                  {s}
                </span>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No significant strengths yet.</p>
            )}
          </div>
        </Card>
        <Card className="border-l-4 border-red-500">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="p-1 bg-red-500/20 rounded text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </span>
            Weaknesses
          </h3>
          <div className="flex flex-wrap gap-2">
            {weaknesses.length > 0 ? (
              weaknesses.map((w) => (
                <span key={w} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm font-medium border border-red-500/20">
                  {w}
                </span>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No significant weaknesses identified.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-2xl font-semibold mb-4">Activity</h3>
        <ContributionHeatmap results={studentResults} />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-2xl font-semibold mb-4">Quiz History</h3>
          {studentResults.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {studentResults.map((result) => {
                  const quiz = quizzes.find(
                    (q) => q._id === result.quizId || q.id === result.quizId
                  );
                  return (
                    <div
                      key={result.submittedAt}
                      className="p-3 bg-slate-800 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold">
                          {quiz?.title || "Unknown Quiz"}
                        </p>
                        <p className="text-sm text-slate-400">
                          Taken on:{" "}
                          {new Date(result.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-lg">{result.score}/100</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-slate-400">No quizzes taken yet.</p>
          )}
        </Card>
        <Card>
          <h3 className="text-2xl font-semibold mb-4">
            Recent Discussion Posts
          </h3>
          {studentPosts.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {studentPosts.map((post) => (
                  <Link
                    to={`/discussions/${post._id || post.id}`}
                    key={post._id || post.id}
                    className="block p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <p className="font-bold truncate">{post.title}</p>
                    <p className="text-sm text-slate-400">
                      Posted on: {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-400">No discussion posts yet.</p>
          )}
        </Card>
      </div>
    </AnimatedWrapper>
  );
};

export default StudentProfilePage;
