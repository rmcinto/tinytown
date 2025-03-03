import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 
 * @param message 
 * @returns 
 */
export const handleRequest = async (message: string): Promise<any | null> => {
    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
    });

    return response.choices[0].message.content;
};