import WebSocket from 'ws';
import fs from 'fs';
import * as readline from 'readline';
import { CharacterDict } from '../../../src/entities/Character';
import game from '../assets/game.json';
import npc1 from '../assets/npc1.json';
import npc2 from '../assets/npc2.json';
import npc3 from '../assets/npc3.json';
import npc4 from '../assets/npc4.json';
import { GameSession, NPCPrompt } from "../../../src/entities/Game";
import { BuildingMapObject, MapObject, NPCMapObject } from '../../../src/entities/Map';
import { Action, GiveParameters, MakeParameters, MoveParameters, TakeParameters, TalkParameters } from '../../../src/entities/Action';
import { v4 as uuidV4 } from "uuid";

const gameId = uuidV4();
const GAME_LOOP_WAIT_MS = 1000;
const LOG_FILE = `${gameId}-websocket.log.json`;
const GAME_FILE = `${gameId}-game`;

// Define an interface for log entries
interface LogEntry {
    timestamp: string;
    request: any;
    response: any;
}

// Global array to store the log entries and a temporary variable for the current pair.
let logEntries: LogEntry[] = [];
let currentLogEntry: LogEntry | null = null;

// Helper to write the full log array as valid JSON to file.
function writeLogFile() {
    fs.writeFileSync(`logs/${LOG_FILE}`, JSON.stringify(logEntries, null, 2));
}

// Utility function that uses readline to ask if the user wants to continue
function askContinue(): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Do you want to continue? (y/n): ', (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
        });
    });
}

interface ResponseHandle {
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
}

interface Conn {
    send: (
        data: any,
        options?: {
            mask?: boolean | undefined;
            binary?: boolean | undefined;
            compress?: boolean | undefined;
            fin?: boolean | undefined;
        },
        cb?: (err?: Error) => void) => void;
    close: (code?: number, data?: string | Buffer) => void;
    handle: ResponseHandle | null;
}

main();

async function main() {
    try {
        const [gameSession, npcs] = loadGame();
        const conn = await connectToServer(gameSession, npcs);
        renderMap(gameSession, npcs);
        gameLoop(gameSession, npcs, conn);
    }
    catch (ex) {
        console.log(ex);
    }
}

/**
 * 
 * @param gameSession 
 * @param npcs 
 * @param conn 
 */
async function gameLoop(gameSession: GameSession, npcs: CharacterDict, conn: Conn) {
    // Play each NPC
    try {
        for (let npc of Object.values(npcs)) {
            const npcPrompt = {
                ...gameSession,
                character: npc
            };
            //@ts-ignore
            delete npcPrompt.history;
            await playNPC(conn, npcPrompt);
        }
    }
    catch (ex) {
        console.log(ex);
    }

    // After processing all NPCs, ask if the user wants to continue.
    const shouldContinue = await askContinue();
    if (shouldContinue) {
        setTimeout(() => gameLoop(gameSession, npcs, conn), GAME_LOOP_WAIT_MS);
    }
    else {
        console.log("Closing connection and exiting game loop.");
        fs.writeFileSync(`logs/${GAME_FILE}.log.json`, JSON.stringify(gameSession, null, 4));
        conn.close();
    }
}

/**
 * Adds the generic NPC data to the game's players
 */
function loadGame(): [GameSession, CharacterDict] {
    const gameSession = game as unknown as GameSession;
    const npcs = {
        npc1,
        npc2,
        npc3,
        npc4
    } as unknown as CharacterDict;

    // Add the NPCs to the game's players list
    for (let npc of Object.values(npcs)) {
        gameSession.players.push({
            npcId: npc.npcId,
            name: npc.profile.name,
            description: npc.profile.description,
            inventory: npc.inventory // creates a reference to the character inventory list
        });
    }

    gameSession.history = [];

    return [gameSession, npcs];
}

/**
 * Opens a websocket and returns a connection interface.
 * Records each request and its matching response together.
 * @returns 
 */
async function connectToServer(gameSession: GameSession, npcs: CharacterDict): Promise<Conn> {
    return new Promise((resolve, reject) => {
        try {
            const ws = new WebSocket("wss://localhost:3000", {
                rejectUnauthorized: false,
            });
            const conn = {
                send: (prompt: any) => {
                    const payload = JSON.stringify({ payload: prompt, route: "chat" });
                    // Create a new log entry for this request.
                    currentLogEntry = {
                        timestamp: new Date().toISOString(),
                        request: prompt,
                        response: null
                    };
                    ws.send(payload);
                },
                close: ws.close.bind(ws),
                handle: null
            };

            ws.on('open', () => {
                console.log("Client socket example opening");
                resolve(conn);
            });

            ws.on('message', (data) => {
                // Convert the Buffer to a string if necessary.
                const text = data instanceof Buffer ? data.toString('utf8') : data;
                const response = JSON.parse(text as string);

                if (!response.actions) {
                    reject(response);
                    return;
                }

                let actions = response.actions as Action[];

                // Add the response to the current log entry and write out the full log.
                if (currentLogEntry) {
                    currentLogEntry.response = response;
                    logEntries.push(currentLogEntry);
                    currentLogEntry = null;
                    writeLogFile();
                }

                handleNpcResponse(gameSession, npcs, actions, conn.handle!);
            });

            ws.on('error', (error) => {
                console.error("WebSocket error:", error);
                reject(error);
            });
        }
        catch (ex) {
            console.error("WebSocket error:", ex);
            reject(ex);
        }
    });
}

/**
 * Updates the map in the console.
 * @param mapData
 * @returns 
 */
function renderMap(gameSession: GameSession, npcs: CharacterDict) {
    const mapData = gameSession.map;
    const [width, height] = mapData.map_size;
    // Create a grid (2D array) filled with dots.
    const grid: string[][] = Array.from({ length: height }, () => Array(width).fill('.'));

    // Place objects on the grid.
    Object.values(mapData.objects).forEach((obj: MapObject) => {
        const [x, y] = obj.position; // positions are 1-indexed
        let symbol = obj.symbol || '?';
        // Adjust for zero-indexing.
        grid[y - 1][x - 1] = symbol;
    });

    // Build the output string (print rows from top to bottom).
    let output = "";
    for (let row = height; row >= 1; row--) {
        const rowLabel = row.toString().padStart(2, ' ');
        const rowCells = grid[row - 1].join("  ");
        output += `${rowLabel} | ${rowCells}\n`;
    }
    // Build the bottom column header.
    let colHeader = "    ";
    for (let col = 1; col <= width; col++) {
        colHeader += col.toString().padStart(2, ' ') + " ";
    }
    output += colHeader;

    for (
        let i = gameSession.history.length - 1;
        i >= Math.max(0, gameSession.history.length - 8);
        i--
    ) {
        output += "\n-------------------------------------------------------------\n";
        const action = gameSession.history[i];
        let params;
        const npc = npcs[action.npcId];
        let toNpc, fromNpc;
        output += `${npc.profile.name}:`;
        switch (action.action) {
            case "give":
                params = action.parameters as GiveParameters;
                toNpc = npcs[params.toNPCId!];
                for (let artifact of params.artifacts) {
                    if (toNpc) {
                        output += `\nGave ${artifact.quantity}x of ${artifact.name} to ${toNpc.profile.name}`;
                    }
                    else {
                        output += `\nDropped ${artifact.quantity}x of ${artifact.name} at ${artifact.position}`;
                    }
                }
                break;
            case "move":
                params = action.parameters as MoveParameters;
                output += `\nMoved from ${params.origin} to ${params.destination}`;
                break;
            case "take":
                params = action.parameters as TakeParameters;
                fromNpc = npcs[params.fromNPCId!];
                for (let artifact of params.artifacts) {
                    if (fromNpc) {
                        output += `\nAccepted ${artifact.quantity}x of ${artifact.name} from ${fromNpc.profile.name}`;
                    }
                    else {
                        output += `\nPicked up ${artifact.quantity}x of ${artifact.name} from ${artifact.position}`;
                    }
                }
                break;
            case "talk":
                params = action.parameters as TalkParameters;
                toNpc = npcs[params.toNPCId];
                if (toNpc) {
                    output += `\nSaid to ${toNpc.profile.name} "${params.say}"`;
                }
                else {
                    output += `\nSaid "${params.say}"`;
                }
                break;
            case "make":
                params = action.parameters as MakeParameters;
                output += `\nMade a ${params.make.name} using ${params.use.map((a) => a.name)}`;
                break;
        }
        output += `\nReasoning: ${action.reasoning}\n`;
    }

    console.clear();
    console.log(output);
}

/**
 * 
 * @param conn 
 * @param npcPrompt 
 */
async function playNPC(conn: Conn, npcPrompt: NPCPrompt) {
    return new Promise((resolve, reject) => {
        try {
            conn.handle = { resolve, reject };
            conn.send(npcPrompt);
        }
        catch (ex) {
            reject(ex);
        }
    });
}

function handleNpcResponse(gameSession: GameSession, npcs: CharacterDict, actions: Action[], handle: ResponseHandle) {
    const mapObjects = gameSession.map.objects;
    if (!Array.isArray(actions)) {
        actions = [actions];
    }

    for (let action of actions) {
        // Record the history
        gameSession.history.push(action);

        // Add the action to the NPC
        const npc = npcs[action.npcId];
        npc.context.push(action);

        // add the action to any other npc that is mentioned
        if (action.parameters.hasOwnProperty("fromNPCId")) {
            const fromNPCId = (action.parameters as TakeParameters).fromNPCId;
            const fromNPC = npcs[fromNPCId!];
            if (fromNPC)
                fromNPC.interactions.push(action);
        }
        if (action.parameters.hasOwnProperty("toNPCId")) {
            const toNPCId = (action.parameters as GiveParameters).toNPCId;
            const toNPC = npcs[toNPCId!];
            if (toNPC)
                toNPC.interactions.push(action);
        }

        if (action.mapUpdates) {
            for (let key of Object.keys(action.mapUpdates)) {
                const mapUpdate = action.mapUpdates[key];
                if (mapUpdate.remove) {
                    delete mapObjects[key];
                }
                else {
                    gameSession.map.objects[key] = mapUpdate as MapObject;
                }
            }
        }
        if (action.inventoryUpdates) {
            for (let npcKey of Object.keys(action.inventoryUpdates)) {
                const npcUpdates = action.inventoryUpdates[npcKey];
                for (let update of Object.values(npcUpdates)) {
                    if (update.quantity) {
                        npcs[npcKey].inventory[update.artifactId] = update;
                    }
                    else {
                        delete npcs[npcKey].inventory[update.artifactId];
                    }
                }
            }
        }
    }

    renderMap(gameSession, npcs);

    handle.resolve();
}
