import type { User, Quiz, QuizResult, Resource, DiscussionPost } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
    getResources: () => request('/api/resources'),
    addResource: (r: Partial<Resource>) => request('/api/resources', { method: 'POST', body: JSON.stringify(r) }),
    getPosts: () => request('/api/posts'),
    getPost: (id: string) => request(`/api/posts/${id}`),
    addPost: (p: Partial<DiscussionPost>) => request('/api/posts', { method: 'POST', body: JSON.stringify(p) }),
    addReply: (postId: string, reply: any) => request(`/api/posts/${postId}/replies`, { method: 'POST', body: JSON.stringify(reply) }),
};

export default api;
