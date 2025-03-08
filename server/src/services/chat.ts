import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handleRequest = async (message: string): Promise<string | null> => {
    console.log("Start chat")
    let content = message;

    let actionText;

    try {
        const response = await openai.chat.completions.create({
            model: 'o3-mini',
            messages: [{ role: 'user', content }],
        });
    
        actionText = response.choices[0].message.content as string;
    }
    catch(error) {
        console.log("Error Getting Chat")
        return JSON.stringify(error);;
    }

    let action;
    try {
        actionText.replace(/(?:^[`]{3}json\r?\n?)|(?:\r?\n?[`]{3}$)/g, "");
        action = JSON.parse(actionText);
    }
    catch(error) {
        console.log("Invalid JSON");
    }
    
    let internalReasoning;
    try {
        content = `(user: ${content}\nsystem: ${actionText})\n\n Why did you choose this response?`;
        const response = await openai.chat.completions.create({
            model: 'o3-mini',
            messages: [{ role: 'user', content }],
        });
        internalReasoning = response.choices[0].message.content;
    }
    catch(ex) {
        console.log("Error Getting Reasoning")
    }
    
    if (action) {
        action.internalReasoning;
        return JSON.stringify(action);
    }
    else {
        return JSON.stringify({
            error: "The chat returned invalid JSON",
            text: actionText,
            internalReasoning
        });
    }
};
