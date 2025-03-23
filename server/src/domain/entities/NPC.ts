import { NPCHistory } from './NPCHistory';

export interface NPCProfile {
    id: string;
    name: string;
    backstory: string;
    properties: Record<string, any>;
}

export class NPC {
    constructor(
        public id: string,
        public profile: NPCProfile,
        public history: NPCHistory
    ) { }
}
