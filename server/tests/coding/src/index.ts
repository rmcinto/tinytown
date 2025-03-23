import codeGenPrompt from '../prompts/code-gen.json';
import WebSocket from 'ws';
import * as readline from 'readline';
import { v4 as uuidV4 } from "uuid";
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// We store each log entry as { type: "request" | "response", data: ... }
interface LogEntry {
    type: "request" | "response";
    data: any; // "data" can contain the request, the response, or both
}

// In-memory array of log entries for this run.
let roundLogs: LogEntry[] = [];

// The current request awaiting a response (if any)
let currentRoundRequest: Request | null = null;

// The path to the current run’s log file.
let logFilePath: string = "";

// Example: "MyProjectName"
let currentProjectName = "default";

// Keep track of running child processes so we can manage or terminate them later if needed.
const childProcesses: Record<string, ChildProcessWithoutNullStreams> = {};

// Create the logs folder if it doesn’t exist.
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs', { recursive: true });
}

// Write the in-memory roundLogs to disk.
function writeLogsToFile() {
    fs.writeFileSync(logFilePath, JSON.stringify(roundLogs, null, 2));
}

// Define interfaces from the code-gen JSON schema

// Base type for actions
interface BaseAction {
    actionType: "run-command" | "think";
    description: string;
    reasoning: string;
}

// Action when a command needs to be executed
interface RunCommandAction extends BaseAction {
    actionType: "run-command";
    command: string;
    path?: string;
    parameter?: string;
    commandResult: string;
}

// Action when the system should "think" (i.e. process cognition)
interface ThinkAction extends BaseAction {
    actionType: "think";
    cognition: string;
}

type Action = RunCommandAction | ThinkAction;

// Interface for the request sent to the WebSocket service.
interface Request {
    instructions: string[];
    goal: string[];
    examples: Action[];
    details: {
        stack: {
            data: string;
            backend: string;
            frontend: string;
        };
        exampleCode: any;
        assets: Record<string, string>;
    };
    history: Action[];
    id: string;
}

// Interface for the structure of code-gen prompt JSON.
interface CodeGenPrompt {
    preamble: string[];
    schema: any;
    instructions: string[];
    goal: string[];
    examples: Action[];
    details: {
        stack: {
            data: string;
            backend: string;
            frontend: string;
        };
        exampleCode: any;
        assets: Record<string, string>;
    };
    history: Action[];
}

// Global round counter to track conversation rounds.
let roundCounter = 0;

// WebSocket reference
let ws: WebSocket | undefined;

// Setup readline for user input on the command line.
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Utility to ask a question in the console.
function askQuestion(query: string): Promise<string> {
    return new Promise(resolve => {
        rl.question(query, answer => resolve(answer));
    });
}

/**
 * Spawns a child process via WSL's bash, passing the entire command
 * as a single argument to `bash -c`. This avoids Windows shell interpretation.
 * 
 * After finishing, if action.path is provided and it points to a file,
 * we load that file’s contents into codeGenPrompt.details.assets.
 */
function spawnProcess(
    action: RunCommandAction,
    projectPath: string,
    codeGenPrompt: CodeGenPrompt
) {
    // Generate a unique key for this child process
    const processKey = `${action.command}-${Date.now()}`;
    action.commandResult = "";

    const child = spawn(
        'wsl',
        ['bash', '-c', action.command],
        {
            cwd: projectPath,
            shell: false
        }
    );

    // Track the spawned process so we can manage it
    childProcesses[processKey] = child;

    // Capture stdout/stderr in memory (not displayed to the console)
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (data: string) => {
        action.commandResult += data;
    });
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', (data: string) => {
        action.commandResult += data;
    });

    // On process close, remove from our record and (if path is a file) load it
    child.on('close', (code) => {
        console.log(`[${processKey}] exited with code ${code}`);
        delete childProcesses[processKey];

        // After finishing, if we have a path, confirm it's a file before reading
        if (action.path) {
            const fullPath = path.join(projectPath, action.path.replace(/^.\//, ''));
            try {
                const stats = fs.statSync(fullPath);

                if (stats.isFile()) {
                    const fileContents = fs.readFileSync(fullPath, 'utf-8');
                    codeGenPrompt.details.assets[action.path] = fileContents;
                    console.log(`Upserted asset for file: ${action.path}`);
                } else {
                    console.log(`Skipping asset read. Path is a directory or non-file: ${fullPath}`);
                }
            } catch (err: any) {
                console.warn(
                    `Error checking file type for "${action.path}": ${err.message}`
                );
            }
        }
    });

    child.on('error', (err) => {
        console.error(`[${processKey}] error: ${err.message}`);
        action.commandResult += `\n[ERROR] ${err.message}`;
        delete childProcesses[processKey];
    });
}

/**
 * Summarize a portion of history actions, producing a single 'think' action
 * to replace them. This is a simplistic approach:
 *   - Count how many run-commands and how many thinks
 *   - Provide a short summary
 */
function summarizeActions(actions: Action[]): ThinkAction {
    let runCommandCount = 0;
    let thinkCount = 0;

    for (const a of actions) {
        if (a.actionType === 'run-command') {
            runCommandCount++;
        } else if (a.actionType === 'think') {
            thinkCount++;
        }
    }

    return {
        actionType: 'think',
        cognition: `Summarized ${actions.length} actions. (${runCommandCount} commands, ${thinkCount} thinks)`,
        description: 'A summary of previous actions to reduce message size.',
        reasoning: 'We reduced the size of the request by summarizing older actions.'
    };
}

/**
 * Attempts to keep the entire request object under a certain size threshold
 * by summarizing older history actions if needed.
 */
function ensureRequestSizeLimit(request: Request, sizeLimit = 15000): Request {
    // Convert to JSON to see how big it is
    let requestStr = JSON.stringify(request);
    if (requestStr.length <= sizeLimit) {
        // It's under the limit, nothing to do
        return request;
    }

    // We remove older actions from history (the front portion),
    // summarizing them as a single 'think' action.
    //
    // We'll keep the last few actions in detail, e.g. last 3.
    // Summarize all older ones in a single 'think' action.
    const keepCount = 3;
    if (request.history.length > keepCount) {
        const olderActions = request.history.slice(0, request.history.length - keepCount);
        const summaryAction = summarizeActions(olderActions);
        const newHistory = [summaryAction, ...request.history.slice(-keepCount)];
        request.history = newHistory;
    }

    // Re-check size; if still too large, you could do another approach
    // like removing run-command body content or further summarizing, but
    // for simplicity, we'll just do one pass here
    requestStr = JSON.stringify(request);
    if (requestStr.length > sizeLimit) {
        console.warn(`Even after summarizing, request is still too big (${requestStr.length} chars).`);
    }
    return request;
}

/**
 * Sends the next prompt via WebSocket:
 * 1) Creates a new Request object
 * 2) Summarizes if request is too large
 * 3) Logs the Request entry
 * 4) Sends it to the server
 */
function sendNextPrompt(goal: string, history: Action[], codeGen: CodeGenPrompt): void {
    roundCounter++;
    let request: Request = {
        instructions: codeGen.instructions,
        goal: [goal],
        examples: codeGen.examples,
        details: codeGen.details,
        history: history,
        id: uuidV4(),
    };

    // 1) Summarize if request is too large
    request = ensureRequestSizeLimit(request, 15000);

    // 2) Log to console
    console.log(`Round ${roundCounter}`);

    // Keep track so we can store the response
    currentRoundRequest = request;

    // 3) Write the request into the logs as a separate entry
    roundLogs.push({
        type: "request",
        data: JSON.parse(JSON.stringify(request)), // store a copy if you want immutability
    });
    writeLogsToFile();

    // 4) Send the request
    ws!.send(JSON.stringify({ route: 'chat', payload: request }));
}

/**
 * Graceful shutdown: kill child processes, close WebSocket, and exit after all processes exit.
 */
function cleanup() {
    console.log("\nGracefully shutting down...");

    // We'll kill each process with SIGTERM, awaiting their 'close' events.
    const killPromises: Promise<void>[] = [];

    for (const key of Object.keys(childProcesses)) {
        const child = childProcesses[key];
        console.log(`Terminating process [${key}] with SIGTERM...`);

        // Create a Promise that resolves once the process closes
        const p = new Promise<void>((resolve) => {
            child.once('close', () => {
                console.log(`[${key}] closed.`);
                resolve();
            });
            // Send SIGTERM
            child.kill('SIGTERM');
        });
        killPromises.push(p);
    }

    // After all child processes have finished, close the app
    Promise.all(killPromises)
        .then(() => {
            console.log("All child processes terminated. Closing application...");
            rl.close();
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            process.exit(0);
        })
        .catch((err) => {
            console.error("Error while closing child processes:", err);
            process.exit(1);
        });
}

// Register Ctrl+C
process.on('SIGINT', cleanup);

/**
 * Main function.
 */
async function main() {
    // 1) Prompt user for project name
    currentProjectName = await askQuestion("Enter your project name: ");

    // 2) Setup a new log file for each run (no prior logs are loaded)
    const startTime = new Date().toISOString().replace(/:/g, '-');
    const logFileName = `${currentProjectName}-[${startTime}].log`;
    logFilePath = path.resolve(process.cwd(), 'logs', logFileName);

    // Overwrite or create a new log file with an empty array
    roundLogs = [];
    fs.writeFileSync(logFilePath, JSON.stringify(roundLogs, null, 2));
    console.log(`Logging to: ${logFilePath}`);

    // 3) Create the project folder if not exists
    const projectPath = path.resolve(process.cwd(), 'projects', currentProjectName);
    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
        console.log(`Created project directory: ${projectPath}`);
    } else {
        console.log(`Project directory already exists: ${projectPath}`);
    }

    // 4) Ask user for the goal
    const goal = await askQuestion("Enter your goal: ");
    let history: Action[] = [];

    // 5) Connect to WebSocket
    ws = new WebSocket('wss://localhost:3000', {
        rejectUnauthorized: false,
    });

    // 6) Once open, send our first prompt
    ws.on('open', () => {
        console.log("Connected to WebSocket server.");
        sendNextPrompt(goal, history, codeGenPrompt as CodeGenPrompt);
    });

    // 7) Handle messages
    ws.on('message', async (data: WebSocket.Data) => {
        try {
            const messageStr = typeof data === 'string' ? data : data.toString();
            let response: { actions: Action[] } = JSON.parse(messageStr);

            // If server returns an array, wrap in { actions: ... }
            if (Array.isArray(response)) {
                response = { actions: response };
            }

            console.log(`Round ${roundCounter} Response has ${response.actions.length} actions`);

            // 7a) Process actions (spawn commands, etc.)
            if (Array.isArray(response.actions)) {
                for (const action of response.actions) {
                    if (action.actionType === "run-command") {
                        console.log(`Spawning command: ${action.command.substring(0, 50)}...`);
                        spawnProcess(action, projectPath, codeGenPrompt as CodeGenPrompt);
                    } else if (action.actionType === "think") {
                        console.log(`Thinking: ${action.cognition}`);
                    }
                    history.push(action);
                }
            } else {
                console.error("Unexpected response format from the WebSocket.");
            }

            // 7b) Log the response in a new entry
            if (currentRoundRequest) {
                roundLogs.push({
                    type: "response",
                    data: {
                        requestID: currentRoundRequest.id,
                        response
                    }
                });
                writeLogsToFile();

                currentRoundRequest = null;
            }

            // 7c) Continue by sending the updated prompt
            sendNextPrompt(goal, history, codeGenPrompt as CodeGenPrompt);
        } catch (err) {
            console.error("Error processing WebSocket message:", err);
        }
    });

    ws.on('error', (err) => {
        console.error("WebSocket error:", err);
    });
}

// Start everything
main();