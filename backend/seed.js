const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./Model/User');
const QuizResult = require('./Model/QuizResult');
const Quiz = require('./Model/Quiz');

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI, { dbName: 'intelliquiz' });
        console.log('Connected to MongoDB (intelliquiz)');

        // 1. Ensure User "ansh" exists
        let user = await User.findOne({ name: 'ansh' });
        if (!user) {
            console.log('Creating user: ansh');
            user = new User({
                name: 'ansh',
                role: 'STUDENT',
                points: 2500,
                password: '123456789'
            });
            await user.save();
        } else {
            console.log('User ansh already exists, updating points and password');
            user.points = 2500;
            user.password = '123456789';
            await user.save();
        }

        // 2. Remove old results for this user
        await QuizResult.deleteMany({ userId: user._id });
        console.log('Cleared old quiz results for ansh');

        // 3. Create Topic-Specific Quizzes for Strengths and Weaknesses
        const topics = [
            { title: 'DSA', type: 'strength', score: 92 },
            { title: 'Web Dev', type: 'strength', score: 89 },
            { title: 'Maths', type: 'weakness', score: 42 },
            { title: 'Physics', type: 'weakness', score: 48 }
        ];

        const quizIds = [];
        for (const topic of topics) {
            let quiz = await Quiz.findOne({ title: topic.title });
            if (!quiz) {
                quiz = new Quiz({ title: topic.title, questionPool: [] });
                await quiz.save();
            }
            quizIds.push({ id: quiz._id, score: topic.score });
        }

        const results = [];

        // Add specific strength/weakness results
        for (const q of quizIds) {
            results.push({
                quizId: q.id,
                userId: user._id,
                score: q.score,
                timeTaken: 120,
                submittedAt: new Date(),
                answers: new Array(10).fill({ isCorrect: true }) // dummy answers
            });
        }

        // 4. Generate random activity over the last 180 days (Heatmap)
        const now = new Date();
        const rangeDays = 180;
        const startDate = new Date();
        startDate.setDate(now.getDate() - rangeDays);

        // Get a default quiz for heatmap data
        let heatmapQuiz = await Quiz.findOne({ title: 'General Knowledge' });
        if (!heatmapQuiz) {
            heatmapQuiz = new Quiz({ title: 'General Knowledge', questionPool: [] });
            await heatmapQuiz.save();
        }

        for (let i = 0; i < 400; i++) {
            const randomDaysOffset = Math.floor(Math.random() * rangeDays);
            const submittedAt = new Date(startDate);
            submittedAt.setDate(startDate.getDate() + randomDaysOffset);
            submittedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

            results.push({
                quizId: heatmapQuiz._id,
                userId: user._id,
                score: Math.floor(Math.random() * 40) + 60,
                timeTaken: Math.floor(Math.random() * 300) + 60,
                submittedAt: submittedAt,
                answers: []
            });
        }

        await QuizResult.insertMany(results);
        console.log(`Inserted ${results.length} quiz results for ansh`);

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

seed();
