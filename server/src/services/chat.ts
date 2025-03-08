import { AnyAaaaRecord } from 'dns';
import { OpenAI } from 'openai';

const MODEL_NAME = 'o3-mini';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handleRequest = async (message: string): Promise<any | null> => {
    console.log("Start chat")
    let content = message;

    let actionText;

    try {
        const response = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: 'user', content }],
        });
    
        actionText = response.choices[0].message.content as string;
    }
    catch(error: any) {
        console.log("Error Getting Chat")
        return {
            message: error.message || error,
            stack: error.stack
        };
    }

    let actions;
    try {
        actionText.replace(/(?:^[`]{3}json\r?\n?)|(?:\r?\n?[`]{3}$)/g, "");
        actions = JSON.parse(actionText);
    }
    catch(error) {
        console.log("Invalid JSON");
    }
    
    let internalReasoning;
    try {
        content = `(user: ${content}\nsystem: ${actionText})\n\n Why did you choose this response?`;
        const response = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: 'user', content }],
        });
        internalReasoning = response.choices[0].message.content;
    }
    catch(ex) {
        console.log("Error Getting Reasoning")
    }
    
    if (actions) {
        return {
            actions,
            internalReasoning
        };
    }
    else {
        return {
            message: "The chat returned invalid JSON",
            chat: actionText,
            internalReasoning
        };
    }
};
