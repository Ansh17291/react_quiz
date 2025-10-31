import type { Quiz, QuizResult, Resource, DiscussionPost } from '../types';

export const BASE = ""

async function request(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
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
            await request('/health');
            return true;
        } catch (e) {
            return false;
        }
    },
    getUsers: () => request('/users'),
    getQuizzes: () => request('/quizzes'),
    getQuiz: (id: string) => request(`/quizzes/${id}`),
    addQuiz: (quiz: Partial<Quiz>) => request('/quizzes', { method: 'POST', body: JSON.stringify(quiz) }),
    submitQuizResult: (quizId: string, payload: Partial<QuizResult>) => request(`/quizzes/${quizId}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
    getResults: () => request('/results').catch(() => []),
    getAssignments: () => request('/assignment').catch(() => []),
    createAssignment: (payload: { quizId: string; studentIds: string[]; deadline?: string; timeLimit?: number; numQuestionsToAssign?: number; isLive?: boolean; }) => request('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
    getAssignmentByQuiz: (quizId: string) => request(`/assignments/by-quiz/${quizId}`),
    updateAssignmentByQuiz: (quizId: string, payload: { studentIds: string[]; deadline?: string; timeLimit?: number; isLive?: boolean; }) => request(`/assignments/by-quiz/${quizId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    getResources: () => request('/resources'),
    addResource: (r: Partial<Resource>) => request('/resources', { method: 'POST', body: JSON.stringify(r) }),
    getPosts: () => request('/posts'),
    getPost: (id: string) => request(`/posts/${id}`),
    // Backend creates posts at /discussions
    addPost: (p: Partial<DiscussionPost>) => request('/discussions', { method: 'POST', body: JSON.stringify(p) }),
    addReply: (postId: string, reply: any) => request(`/posts/${postId}/replies`, { method: 'POST', body: JSON.stringify(reply) }),
    updateUserPassword: (userId: string, password: string) => request(`/users/${userId}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
};

export default api;
