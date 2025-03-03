import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handleRequest = async (message: string): Promise<string | null> => {
    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
    });

    return response.choices[0].message.content;
};
