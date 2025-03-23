import { Action } from "./Action";
import { Character, Player } from "./Character";
import { MapData } from "./Map";

export interface GameSession {
    gameInstructions: GameInstructions;
    properties: Record<string, string>;
    gameState: GameState;
    history: Action[];
}

export interface GameInstructions {
    instructions: string[];
    outputSchema: Record<string, string>;
}

export interface GameState {
    backstory: string[];
    goal: string[];
    rules: string[];
    exampleResponses: Action[];
    players: Player[];
    maps: Record<string, MapData>;
}

export interface GameStatePrompt extends GameState {
    character: Character;
}

export interface NPCPrompt {
    gameInstructions: GameInstructions;
    properties: Record<string, string>;
    gameState: GameStatePrompt;
}

export interface NPCServiceRequest {
    route: string;
    message: string;
}