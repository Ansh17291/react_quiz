const mongoose = require('mongoose');
const User = require('./Model/User');
const Quiz = require('./Model/Quiz');
const QuizResult = require('./Model/QuizResult');
require('dotenv').config();

async function sync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'intelliquiz' });
        console.log('Connected to MongoDB');

        const students = await User.find({ role: 'STUDENT' });
        const quizzes = await Quiz.find();
        const quizMap = new Map();
        quizzes.forEach(q => quizMap.set(q._id.toString(), q));

        for (const student of students) {
            console.log(`Syncing ${student.name}...`);
            const results = await QuizResult.find({ userId: student._id });

            const categoryStats = new Map();
            results.forEach(res => {
                const quiz = quizMap.get(res.quizId.toString());
                if (quiz) {
                    let category = quiz.category || 'General';

                    // Heuristic: if category is General but title says Maths/SQL, map it!
                    if (category === 'General') {
                        const title = quiz.title.toLowerCase();
                        if (title.includes('maths') || title.includes('mathematics')) category = 'Maths';
                        else if (title.includes('sql')) category = 'SQL';
                    }

                    const stats = categoryStats.get(category) || { totalScore: 0, count: 0 };
                    categoryStats.set(category, {
                        totalScore: stats.totalScore + res.score,
                        count: stats.count + 1
                    });
                }
            });

            const strengths = [];
            const weaknesses = [];
            for (const [cat, stats] of categoryStats.entries()) {
                const avg = stats.totalScore / stats.count;
                if (avg >= 50) strengths.push(cat);
                else weaknesses.push(cat);
            }

            student.categoryStats = categoryStats;
            student.strengths = strengths;
            student.weaknesses = weaknesses;
            student.points = results.reduce((sum, r) => sum + r.score, 0);
            await student.save();
            console.log(`- Updated ${student.name}: S=[${strengths.join(', ')}], W=[${weaknesses.join(', ')}]`);
        }
        console.log('Final sync complete.');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
sync();
