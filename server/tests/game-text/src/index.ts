import WebSocket from 'ws';
import fs from 'fs';
import * as readline from 'readline';
import { CharacterDict } from '../entities/Character';
import game from '../assets/game.json';
import npc1 from '../assets/npc1.json';
import npc2 from '../assets/npc2.json';
import npc3 from '../assets/npc3.json';
import npc4 from '../assets/npc4.json';
import { GameSession, NPCPrompt } from "../entities/Game";
import { BuildingMapObject, MapData, MapObject, NPCMapObject } from '../entities/Map';
import { Action, GiveParameters, InteractParameters, MakeParameters, MapUpdate, MapUpdateItem, MoveParameters, TakeParameters, TalkParameters } from '../entities/Action';
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
        process.on('SIGINT', () => {
            shutdownGame(gameSession, conn);
            process.exit(0);
        });
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
                gameInstructions: gameSession.gameInstructions,
                properties: gameSession.properties,
                gameState: {
                    ...gameSession.gameState,
                    character: npc
                }
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
    const shouldContinue = true//await askContinue();
    if (shouldContinue) {
        setTimeout(() => gameLoop(gameSession, npcs, conn), GAME_LOOP_WAIT_MS);
    }
    else {
        shutdownGame(gameSession, conn);
    }
}

function shutdownGame(gameSession: GameSession, conn: Conn) {
    console.log("Closing connection and exiting game loop.");
    fs.writeFileSync(`logs/${GAME_FILE}.log.json`, JSON.stringify(gameSession, null, 4));
    conn.close();
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
        gameSession.gameState.players.push({
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
    const maps = gameSession.gameState.maps;
    const mapDataArray = Object.values(maps);

    // Create an array of string arrays, each representing a map with its own axes.
    const mapBlocks: string[][] = mapDataArray.map(mapData => {
        const width = mapData.map_size[0];
        const height = mapData.map_size[1];

        // Create grid (2D array) filled with dots.
        const grid: string[][] = Array.from({ length: height }, () => Array(width).fill('.'));

        // Place objects on the grid.
        Object.values(mapData.objects).forEach((obj: MapObject) => {
            const [x, y] = obj.position; // positions are 1-indexed
            grid[y - 1][x - 1] = obj.symbol || '?';
        });

        // Build block lines with row numbers (from top, showing highest row at top)
        const blockLines: string[] = [];
        for (let row = height; row >= 1; row--) {
            const rowLabel = row.toString().padStart(2, ' ');
            const rowCells = grid[row - 1].join("  ");
            blockLines.push(`${rowLabel} | ${rowCells}`);
        }
        // Build column header.
        let colHeader = "    "; // extra space for row labels
        for (let col = 1; col <= width; col++) {
            colHeader += col.toString().padStart(2, ' ') + " ";
        }
        blockLines.push(colHeader);
        return blockLines;
    });

    // Find the maximum height among the map blocks.
    const maxBlockHeight = Math.max(...mapBlocks.map(block => block.length));

    // Pad each block at the top so they all have the same number of lines.
    const paddedBlocks = mapBlocks.map(block => {
        const blockWidth = block[0].length;
        const missingLines = maxBlockHeight - block.length;
        // Create a blank line with the same width.
        const blankLine = " ".repeat(blockWidth);
        return Array(missingLines).fill(blankLine).concat(block);
    });

    // Combine the padded blocks line-by-line with a vertical separator.
    let combinedOutput = "";
    for (let i = 0; i < maxBlockHeight; i++) {
        const lineParts = paddedBlocks.map(block => block[i]);
        // Use " || " as the vertical separator between maps.
        if (i === maxBlockHeight -1)
            combinedOutput += lineParts.join("|| ") + "\n";
        else
            combinedOutput += lineParts.join(" || ") + "\n";
    }

    // Append game session history below the maps.
    let historyOutput = "";
    for (
        let i = gameSession.history.length - 1;
        i >= Math.max(0, gameSession.history.length - 8);
        i--
    ) {
        historyOutput += "\n-------------------------------------------------------------\n";
        const action = gameSession.history[i];
        let params;
        const npc = npcs[action.npcId];
        let toNpc, fromNpc;
        historyOutput += `${npc.profile.name}:`;
        switch (action.action) {
            case "give":
                params = action.parameters as GiveParameters;
                toNpc = npcs[params.toNPCId!];
                for (let artifact of params.artifacts) {
                    if (toNpc) {
                        historyOutput += `\nGave ${artifact.quantity}x of ${artifact.name} to ${toNpc.profile.name}`;
                    } else {
                        historyOutput += `\nDropped ${artifact.quantity}x of ${artifact.name} at ${artifact.position}`;
                    }
                }
                break;
            case "move":
                params = action.parameters as MoveParameters;
                historyOutput += `\nMoved from ${params.origin} to ${params.destination}`;
                break;
            case "take":
                params = action.parameters as TakeParameters;
                fromNpc = npcs[params.fromNPCId!];
                for (let artifact of params.artifacts) {
                    if (fromNpc) {
                        historyOutput += `\nAccepted ${artifact.quantity}x of ${artifact.name} from ${fromNpc.profile.name}`;
                    } else {
                        historyOutput += `\nPicked up ${artifact.quantity}x of ${artifact.name} from ${artifact.position}`;
                    }
                }
                break;
            case "talk":
                params = action.parameters as TalkParameters;
                toNpc = npcs[params.toNPCId];
                if (toNpc) {
                    historyOutput += `\nSaid to ${toNpc.profile.name} "${params.say}"`;
                } else {
                    historyOutput += `\nSaid "${params.say}"`;
                }
                break;
            case "make":
                params = action.parameters as MakeParameters;
                historyOutput += `\nMade a ${params.make.name} using ${params.use.map((a) => a.name)}`;
                break;
            case "interact":
                params = action.parameters as InteractParameters;
                historyOutput += `\n${params.interaction} ${params.effect}`;
                break;
            case "wait":
                historyOutput += `\nWaited`;
                break;
        }
        historyOutput += `\nReasoning: ${action.reasoning}\n`;
    }

    const output = combinedOutput + historyOutput;
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
        if (action.newMaps) {
            for (let key of Object.keys(action.newMaps)) {
                const mapData = action.newMaps[key];
                gameSession.gameState.maps[key] = mapData;
            }
        }
        if (action.mapUpdates) {
            for (let mapId of Object.keys(action.mapUpdates)) {
                const mapUpdate = action.mapUpdates[mapId] as unknown as MapUpdate;
                const mapObjects = gameSession.gameState.maps[mapId].objects;
                for(let mapItemId of Object.keys(mapUpdate)) {
                    const mapUpdateItem = mapUpdate[mapItemId];
                    if (mapUpdateItem.remove) {
                        delete mapObjects[mapItemId];
                    }
                    else {
                        mapObjects[mapItemId] = mapUpdateItem;
                    }
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

    fs.writeFileSync(`logs/${GAME_FILE}.log.json`, JSON.stringify(gameSession, null, 4));

    renderMap(gameSession, npcs);

    handle.resolve();
}
