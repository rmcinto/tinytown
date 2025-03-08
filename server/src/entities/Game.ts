import { Action } from "./Action";
import { Character, Player } from "./Character";
import { MapData } from "./Map";

export interface GameSession {
    description: string[];
    backstory: string[];
    goal: string[];
    rules: string[];
    exampleResponses: Action[];
    players: Player[];
    map: MapData;
    history: Action[];
}

export interface NPCPrompt extends GameSession {
    character: Character;
}

export interface NPCServiceRequest {
    route: string;
    message: string;
}