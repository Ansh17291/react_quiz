# Backend for IntelliQuiz

This is a minimal Express + MongoDB (Mongoose) backend used by the frontend.

Environment

- Create a `.env` file in the `backend/` folder with at least:

```
MONGODB_URI=mongodb://127.0.0.1:27017
PORT=8080
DB_NAME=intelliquiz
```

Install & run

```powershell
cd backend
npm install
npm run dev   # for development with nodemon
# or
npm start     # run once
```

API endpoints (basic)

- GET /api/health
- GET /api/users
- POST /api/users
- GET /api/resources
- POST /api/resources
- GET /api/posts
- POST /api/posts
- POST /api/posts/:id/replies
- GET /api/quizzes
- POST /api/quizzes
- POST /api/quizzes/:id/submit

Additional endpoints

- GET /api/results
- GET /api/assignments
- POST /api/assignments

Auth

- POST /api/auth/register  { name, role, password } -> { user, token }
- POST /api/auth/login     { name, password } -> { user, token }

Notes

- The models were adapted from the repository provided. Some fields were normalized (use ObjectId refs where appropriate).
-- The backend now includes optional JWT-based auth. Create a `.env` with `JWT_SECRET` to sign tokens. If not set a default secret will be used (change in production).
