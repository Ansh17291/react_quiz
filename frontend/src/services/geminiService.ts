import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { Question, AIAnalysis, ChatMessage } from '../types';

if (! import.meta.env.VITE_API_KEY ) {
  console.warn("API_KEY environment variable not set. Using a placeholder. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY || "DUMMY_KEY_FOR_DEV" });

let chat: Chat | null = null;

const quizGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        quizTitle: { type: Type.STRING },
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionText: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    correctAnswerIndex: { type: Type.INTEGER }
                },
                required: ["questionText", "options", "correctAnswerIndex"]
            }
        }
    },
    required: ["quizTitle", "questions"]
};

export const generateQuizFromText = async (text: string, numQuestions: number = 10): Promise<{ title: string; questions: Omit<Question, 'id'>[] }> => {
    try {
        const prompt = `Based on the following text, create a multiple-choice quiz with exactly ${numQuestions} questions. Each question should have 4 options. Ensure the correctAnswerIndex is the 0-based index of the correct option in the options array.

        Text:
        ---
        ${text}
        ---
        
        Generate the quiz in the specified JSON format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizGenerationSchema,
            }
        });

        const jsonString = response.text;
        if (!jsonString) {
            throw new Error("AI did not return a valid response.");
        }
        const parsed = JSON.parse(jsonString!);
        
        return { title: parsed.quizTitle, questions: parsed.questions };
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error("Failed to generate quiz. Please check the provided text and try again.");
    }
};

export const generateQuizFromTopics = async (topics: string[], numQuestions: number = 5): Promise<{ title: string; questions: Omit<Question, 'id'>[] }> => {
    try {
        const prompt = `A student is struggling with the concepts in the following questions. Create a new, different multiple-choice quiz with exactly ${numQuestions} questions to help them practice these concepts. The new questions should cover the same underlying topics but should not be identical to the provided questions. Each new question must have 4 options.

        Struggled Questions/Topics:
        ---
        - ${topics.join('\n- ')}
        ---
        
        Generate a new quiz titled "Practice Quiz for Your Weak Topics" in the specified JSON format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizGenerationSchema,
            }
        });

        const jsonString = response.text;
        if (!jsonString) {
            throw new Error("AI did not return a valid response.");
        }
        const parsed = JSON.parse(jsonString);
        
        return { title: parsed.quizTitle, questions: parsed.questions };
    } catch (error) {
        console.error("Error generating remedial quiz:", error);
        throw new Error("Failed to generate a practice quiz. The AI may be busy, please try again later.");
    }
};


export const generateSimilarQuestions = async (baseQuestion: Omit<Question, 'id'>, numToGenerate: number = 2): Promise<Omit<Question, 'id'>[]> => {
    try {
        const prompt = `Based on the following multiple-choice question, create ${numToGenerate} new, similar but not identical multiple-choice questions. They should test the same concept. Each new question must have 4 options.

        Base Question:
        ---
        - Question: ${baseQuestion.questionText}
        - Options: ${baseQuestion.options.join(', ')}
        - Correct Answer: ${baseQuestion.options[baseQuestion.correctAnswerIndex]}
        ---
        
        Generate the new questions in the specified JSON format, under a "questions" key.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: quizGenerationSchema.properties.questions
                    },
                    required: ["questions"]
                },
            }
        });

        const jsonString = response.text;
        if (!jsonString) {
            throw new Error("AI did not return a valid response.");
        }
        const parsed = JSON.parse(jsonString!);
        
        return parsed.questions || [];
    } catch (error) {
        console.error("Error generating similar questions:", error);
        throw new Error("Failed to generate similar questions with AI.");
    }
};


const aiAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: { type: Type.STRING, description: "A clear explanation of why the user's answer was incorrect and why the correct answer is right. Use simple HTML for formatting like <b> for bold." },
        remedialTopic: { type: Type.STRING, description: "The specific topic or concept the user should study to understand this question better." }
    },
    required: ["explanation", "remedialTopic"]
};


export const analyzeAnswer = async (question: Question, userAnswer: string): Promise<Omit<AIAnalysis, 'questionText' | 'yourAnswer' | 'correctAnswer'>> => {
    try {
        const prompt = `A student answered a quiz question incorrectly.

Question: "${question.questionText}"
Options: ${question.options.join(', ')}
Correct Answer: "${question.options[question.correctAnswerIndex]}"
Student's Incorrect Answer: "${userAnswer}"

Provide a brief explanation why the student's answer is incorrect and why the correct answer is right, and suggest a remedial topic. Return the result as JSON with keys "explanation" and "remedialTopic".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: aiAnalysisSchema,
            }
        });

        const jsonString = response.text;
        if (!jsonString) {
            throw new Error("AI did not return a valid response.");
        }
        const parsed = JSON.parse(jsonString);
        return parsed;

    } catch (error) {
        console.error("Error analyzing answer:", error);
        throw new Error("Failed to get AI analysis.");
    }
};

export const generateNotes = async (topic: string): Promise<string> => {
    try {
        const prompt = `Generate: any concise, easy-to-understand study notes for a student on the following topic: "${topic}". Use HTML tags like <h3> for headings, <ul> and <li> for bullet points, and <b> for bold text to structure the notes for better readability. Do not include \`\`\`html or any markdown formatting. Output only the raw HTML content that can be placed inside a <div>.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text ?? "";
    } catch (error) {
        console.error("Error generating notes:", error);
        throw new Error("Failed to generate notes.");
    }
};

// --- CHATBOT SERVICE ---
export const startChat = () => {
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are a friendly and helpful AI tutor for the IntelliQuiz AI Platform. Your goal is to assist students with their learning, explain concepts clearly, and answer their questions about various academic subjects. Keep your answers concise and encouraging.",
        },
    });
};

export const sendMessageToBot = async (history: ChatMessage[], message: string) => {
    if (!chat) {
        startChat();
    }
    
    // The `sendMessageStream` is better for real-time chat UI updates.
    const result = await chat!.sendMessageStream({ message });
    return result;
};
