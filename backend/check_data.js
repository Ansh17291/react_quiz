const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./Model/User');
const QuizResult = require('./Model/QuizResult');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'intelliquiz' });
        console.log('Connected to MongoDB (intelliquiz)');

        const user = await User.findOne({ name: 'ansh' });
        if (!user) {
            console.log('User ansh NOT FOUND');
        } else {
            console.log(`User ansh found with ID: ${user._id}`);
            const resultsCount = await QuizResult.countDocuments({ userId: user._id });
            console.log(`Quiz results for ansh: ${resultsCount}`);

            const sampleResults = await QuizResult.find({ userId: user._id }).limit(5).sort({ submittedAt: -1 });
            console.log('Sample results:', sampleResults.map(r => ({
                id: r._id,
                submittedAt: r.submittedAt,
                score: r.score
            })));
        }

        const allUsers = await User.find({}, 'name role');
        console.log('All Users in DB:', allUsers);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}

check();
