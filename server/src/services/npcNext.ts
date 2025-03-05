import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface NPCProfile {
    id: string;

}

/**
 * 
 * @param message 
 * @returns 
 */
export const handleRequest = async (npcId: string): Promise<any | null> => {
    //get the npc context using the npcId
    //  The npcId is the id of the npc in a particular game.
    //   



};