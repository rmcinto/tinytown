import { Action } from "./Action";

// Player represents a summary of a character for the prompt
export interface Player {
    npcId: string;
    name: string;
    description: string;
    inventory: Record<string, InventoryItem>;
}

// InventoryItem represents an artifact held by an NPC.
export interface InventoryItem {
    artifactId: string;
    name: string;
    quantity: number;
    price: string;
}

export interface Character {
    npcId: string;
    profile: Profile;
    inventory: Record<string, InventoryItem>;
    map_position: [number, number];
    history: string[];
    context: Action[];
    interactions: Action[];
}

export type CharacterDict = Record<string, Character>;

export interface Profile {
    npcProfileId: string;
    name: string;
    description: string;
    backstory: string;
    personality: string[];
}