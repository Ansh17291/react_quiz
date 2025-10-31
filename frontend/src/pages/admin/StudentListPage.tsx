import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { Button, Card } from "../../components/ui";
import { TrophyIcon } from "../../components/Icons";

const StudentListPage = () => {
  const { users } = useAppContext();
  const navigate = useNavigate();
  const students = users
    .filter((u) => u.role === "STUDENT")
    .sort((a, b) => b.points - a.points);

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Students Leaderboard</h2>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="p-4 bg-slate-700 rounded-lg flex flex-col items-center text-center"
            >
              <h3 className="text-lg font-bold">{student.name}</h3>
              <p className="text-yellow-400 flex items-center gap-1">
                <TrophyIcon className="w-4 h-4" /> {student.points} Points
              </p>
              <Button
                onClick={() => navigate(`/student/${student.id}`)}
                variant="secondary"
                className="mt-4"
              >
                View Profile
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </AnimatedWrapper>
  );
};

export default StudentListPage;
