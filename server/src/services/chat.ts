import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handleRequest = async (message: string): Promise<string | null> => {
    console.log("Start chat")
    let content = "Use this json as your strict instructions:\n" + message;
    const response = await openai.chat.completions.create({
        model: 'o3-mini',
        messages: [{ role: 'user', content }],
    });
    const actionText = response.choices[0].message.content as string;
    const action = JSON.parse(actionText.replace(/(?:^[`]{3}json\r?\n?)|(?:\r?\n?[`]{3}$)/g, ""));

    content = `user: ${content}\nsystem: ${actionText}\nuser: Why did you choose this response?`;
    const response2 = await openai.chat.completions.create({
        model: 'o3-mini',
        messages: [{ role: 'user', content }],
    });

    action.internalReasoning = response2.choices[0].message.content;

    console.log("End chat")
    return JSON.stringify(action);
};
