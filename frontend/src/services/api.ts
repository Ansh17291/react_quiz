import type { Quiz, QuizResult, Resource, DiscussionPost } from '../types';

export const BASE = "http://localhost:8080";

async function request(path: string, opts: RequestInit = {}) {
    // attach Authorization header if token is stored in localStorage currentUser
    const stored = localStorage.getItem('currentUser');
    let token: string | null = null;
    try {
        const parsed = stored ? JSON.parse(stored) : null;
        token = parsed?.token || null;
    } catch (e) {
        token = null;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        // Log warning for protected routes when token is missing
        const isAuthRoute = path.includes('/api/classrooms') ||
            path === '/api/users' ||
            path === '/api/quizzes' ||
            path === '/api/resources' ||
            path === '/api/posts' ||
            path === '/api/results' ||
            path === '/api/assignments';

        if (isAuthRoute) {
            console.warn(`Auth required but token missing for: ${path}. User may need to re-login.`);
        }
    }

    const res = await fetch(`${BASE}${path}`, {
        headers,
        ...opts,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${path} failed: ${res.status} ${res.statusText} ${text}`);
    }
    // Some endpoints may return empty body
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return null;
}

export const api = {
    health: async () => {
        try {
            await request('/api/health');
            return true;
        } catch (e) {
            return false;
        }
    },
    getUsers: () => request('/api/users'),
    getQuizzes: () => request('/api/quizzes'),
    getQuiz: (id: string) => request(`/api/quizzes/${id}`),
    addQuiz: (quiz: Partial<Quiz>) => request('/api/quizzes', { method: 'POST', body: JSON.stringify(quiz) }),
    submitQuizResult: (quizId: string, payload: Partial<QuizResult>) => request(`/api/quizzes/${quizId}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
    getResults: () => request('/api/results').catch(() => []),
    getAssignments: () => request('/api/assignments').catch(() => []),
    createAssignment: (payload: { quizId: string; studentIds: string[]; deadline?: string; timeLimit?: number; numQuestionsToAssign?: number; isLive?: boolean; }) => request('/api/assignments', { method: 'POST', body: JSON.stringify(payload) }),
    getAssignmentByQuiz: (quizId: string) => request(`/api/assignments/by-quiz/${quizId}`),
    updateAssignmentByQuiz: (quizId: string, payload: { studentIds: string[]; deadline?: string; timeLimit?: number; isLive?: boolean; }) => request(`/api/assignments/by-quiz/${quizId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    getResources: () => request('/api/resources'),
    addResource: (r: Partial<Resource>) => request('/api/resources', { method: 'POST', body: JSON.stringify(r) }),
    getPosts: () => request('/api/posts'),
    getPost: (id: string) => request(`/api/posts/${id}`),
    addPost: (p: Partial<DiscussionPost>) => request('/api/discussions', { method: 'POST', body: JSON.stringify(p) }),
    addReply: (postId: string, reply: any) => request(`/api/discussions/reply`, { method: 'POST', body: JSON.stringify({ postId, optimistic: reply }) }),
    updateUserPassword: (userId: string, password: string) => request(`/api/users/${userId}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
    // Polls
    getPolls: () => request('/api/polls'),
    createPoll: (payload: any) => request('/api/polls', { method: 'POST', body: JSON.stringify(payload) }),
    startPoll: (pollId: string, timeLimitSeconds?: number) => request(`/api/polls/${pollId}/start`, { method: 'POST', body: JSON.stringify({ timeLimitSeconds }) }),
    votePoll: (pollId: string, optionIndex: number, userId?: string) => request(`/api/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ optionIndex, userId }) }),
    getPollSession: (pollId: string) => request(`/api/polls/${pollId}/session`),
    advancePoll: (pollId: string, timeLimitSeconds?: number) => request(`/api/polls/${pollId}/next`, { method: 'POST', body: JSON.stringify({ timeLimitSeconds }) }),
    // poll assignments
    assignPoll: (pollId: string, payload: { studentIds: string[]; deadline?: string; timeLimit?: number; isLive?: boolean }) => request(`/api/polls/${pollId}/assign`, { method: 'POST', body: JSON.stringify(payload) }),
    getPollAssignment: (pollId: string) => request(`/api/polls/assignments/by-poll/${pollId}`),
    getAssignedPolls: () => request('/api/polls/assigned'),
    deletePoll: (pollId: string) => request(`/api/polls/${pollId}`, { method: 'DELETE' }),
    // Classrooms
    getClassrooms: () => request('/api/classrooms'),
    getClassroom: (id: string) => request(`/api/classrooms/${id}`),
    createClassroom: (payload: { name: string; description?: string; studentIds?: string[] }) => request('/api/classrooms', { method: 'POST', body: JSON.stringify(payload) }),
    joinClassroom: (classCode: string) => request('/api/classrooms/join', { method: 'POST', body: JSON.stringify({ classCode }) }),
    getClassroomResources: (id: string) => request(`/api/classrooms/${id}/resources`),
    uploadClassroomResource: (classroomId: string, formData: FormData) => fetch(`${BASE}/api/classrooms/${classroomId}/resources`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('currentUser') || '{}').token || ''}`
        },
        body: formData
    }).then(res => res.json()),
    searchYoutubeVideos: (query: string): Promise<any[]> => request(`/api/youtube/search?q=${encodeURIComponent(query)}`),
};

export default api;