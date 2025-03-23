import { ArtifactCollection } from "./Artifact";

export interface CharacterBase {
    npcId: string;              // Unique identifier for the NPC.
    npcType: string;            // Type of NPC (e.g., "Villager", "Guard").
    name: string;               // Name of the NPC. This can be used to refer to the NPC in the game.
    description: string;        // Description of the NPC.  This can be used to provide a brief overview of the NPC's appearance, personality, and/or role in the game.
}

export interface Character extends CharacterBase {
    backstory: string;          // Backstory or origin details.
    dialog: string[];           // Array of dialog lines for the NPC.
}

export interface CharacterExtended extends CharacterBase {
    level: number;              // Level of the character.
    experience: number;         // Experience points earned by the character.
    health: number;             // Current health points.
    maxHealth: number;          // Maximum health points.
    mana: number;               // Current mana points.
    maxMana: number;            // Maximum mana points.
    attack: number;             // Attack power of the character.
    defense: number;            // Defense points of the character.
    magic: number;              // Magic power of the character.
    resist: number;             // Magic resistance of the character.
    speed: number;              // Speed of the character.
    inventory: ArtifactCollection[];       // Array of item IDs representing the character's inventory.
    equipment: { [slot: string]: string }; // Mapping of equipment slots to item IDs.
    status: string[];                      // Array of status effects or conditions affecting the character.
    customData?: { [key: string]: any };   // Any additional custom metadata.
}

export interface CharacterCollection {
    [npcId: string]: CharacterBase;
}

