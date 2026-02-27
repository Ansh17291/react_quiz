import { useEffect, useState } from "react";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { Card } from "../../components/ui";
import { api } from "../../services/api";

const AdminHistoryPage = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [q, r] = await Promise.all([api.getQuizzes(), api.getResults()]);
        setQuizzes(q || []);
        setResults(r || []);
      } catch (e) {
        setError("Failed to load history");
      }
    })();
  }, []);

  const quizIdToResults = quizzes.reduce(
    (acc: Record<string, any[]>, q: any) => {
      acc[q._id || q.id] = results.filter((r) => r.quizId === (q._id || q.id));
      return acc;
    },
    {}
  );

  return (
    <AnimatedWrapper className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Quiz History</h2>
      {error && (
        <div className="p-3 bg-red-500/20 text-red-400 rounded">{error}</div>
      )}
      <div className="max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
        {quizzes.map((q) => {
          const list = quizIdToResults[q._id || q.id] || [];
          return (
            <Card key={q._id || q.id} className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{q.title}</h3>
                <span className="text-sm text-slate-400">
                  {q.questionPool?.length || 0} questions
                </span>
              </div>
              <div className="mt-4">
                {list.length === 0 ? (
                  <p className="text-slate-400">No attempts yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-300">
                          <th className="py-2 pr-4">User</th>
                          <th className="py-2 pr-4">Score</th>
                          <th className="py-2 pr-4">Time</th>
                          <th className="py-2 pr-4">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r, idx) => (
                          <tr key={idx} className="border-t border-slate-700">
                            <td className="py-2 pr-4">{r.userId}</td>
                            <td className="py-2 pr-4 font-semibold">
                              {r.score}%
                            </td>
                            <td className="py-2 pr-4">
                              {Math.floor((r.timeTaken || 0) / 60)}m{" "}
                              {(r.timeTaken || 0) % 60}s
                            </td>
                            <td className="py-2 pr-4">
                              {new Date(r.submittedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </AnimatedWrapper>
  );
};

export default AdminHistoryPage;
