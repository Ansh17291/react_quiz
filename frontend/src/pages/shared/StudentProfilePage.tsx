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
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
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
  useEffect(() => {
    if (!student || studentResults.length === 0 || quizzes.length === 0) {
      setIsLoading(false);
      return;
    }

    const calculatedGrade = Math.round(
      studentResults.reduce((acc, r) => acc + r.score, 0) /
      studentResults.length
    );
    setGrade(calculatedGrade);

    const topicCounter: Record<string, { correct: number; total: number }> = {};

    studentResults.forEach((res) => {
      const quiz = quizzes.find(
        (q) => String(q._id) === String(res.quizId) || String(q.id) === String(res.quizId)
      );
      if (quiz) {
        if (!topicCounter[quiz.title]) {
          topicCounter[quiz.title] = { correct: 0, total: 0 };
        }
        if (res.answers && res.answers.length > 0) {
          const correctCount = Math.round((res.score / 100) * res.answers.length);
          topicCounter[quiz.title].correct += correctCount;
          topicCounter[quiz.title].total += res.answers.length;
        }
      }
    });

    const calculatedStrengths = Object.entries(topicCounter)
      .filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.8)
      .map(([k]) => k);

    const calculatedWeaknesses = Object.entries(topicCounter)
      .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.7)
      .map(([k]) => k);

    setStrengths(calculatedStrengths);
    setWeaknesses(calculatedWeaknesses);
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xl font-bold text-green-400 mb-2">Strengths</h4>
            {strengths.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">
                No specific strengths identified yet.
              </p>
            )}
          </div>
          <div>
            <h4 className="text-xl font-bold text-red-400 mb-2">Weaknesses</h4>
            {weaknesses.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {weaknesses.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">
                No specific weaknesses identified yet.
              </p>
            )}
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="text-2xl font-semibold mb-4">Activity</h3>
        <ContributionHeatmap results={studentResults} />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-2xl font-semibold mb-4">Quiz History</h3>
          {studentResults.length > 0 ? (
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
          ) : (
            <p className="text-slate-400">No quizzes taken yet.</p>
          )}
        </Card>
        <Card>
          <h3 className="text-2xl font-semibold mb-4">
            Recent Discussion Posts
          </h3>
          {studentPosts.length > 0 ? (
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
          ) : (
            <p className="text-slate-400">No discussion posts yet.</p>
          )}
        </Card>
      </div>
    </AnimatedWrapper>
  );
};

export default StudentProfilePage;
