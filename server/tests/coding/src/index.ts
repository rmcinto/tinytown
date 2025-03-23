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

    // We add fields for separate stdout & stderr logs
    stdout?: string;
    stderr?: string;

    // We add a processId so we can reference or kill it later
    processId?: number;
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

// Summaries for old actions, same logic as before
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
    let requestStr = JSON.stringify(request);
    if (requestStr.length <= sizeLimit) {
        return request;
    }
    const keepCount = 20;
    if (request.history.length > keepCount) {
        const olderActions = request.history.slice(0, request.history.length - keepCount);
        const summaryAction = summarizeActions(olderActions);
        const newHistory = [summaryAction, ...request.history.slice(-keepCount)];
        request.history = newHistory;
    }

    requestStr = JSON.stringify(request);
    if (requestStr.length > sizeLimit) {
        console.warn(`Even after summarizing, request is still too big (${requestStr.length} chars).`);
    }
    return request;
}

// Global round counter
let roundCounter = 0;

// WebSocket reference
let ws: WebSocket | undefined;

// Setup readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Utility to ask a question
function askQuestion(query: string): Promise<string> {
    return new Promise(resolve => {
        rl.question(query, answer => resolve(answer));
    });
}

/**
 * Spawns a child process via WSL's bash, passing the entire command
 * as a single argument to `bash -c`.
 *
 * - We record the child's PID in the action's processId so it can be killed later.
 * - We store stdout data in action.stdout, stderr in action.stderr.
 * - If action.path points to a file, we read that file after the process closes.
 */
function spawnProcess(
    action: RunCommandAction,
    projectPath: string,
    codeGenPrompt: CodeGenPrompt
) {
    // Identify this process uniquely
    const processKey = `${action.command}-${Date.now()}`;

    // Create the child process
    const child = spawn('wsl', ['bash', '-c', action.command], {
        cwd: projectPath,
        shell: false
    });

    // Save child in a global record so we can kill it if needed
    childProcesses[processKey] = child;

    // Record the child PID on the action
    action.processId = child.pid;

    // Initialize stdout/stderr
    action.stdout = "";
    action.stderr = "";

    // Capture real-time stdout (append to action.stdout)
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (data: string) => {
        action.stdout += data;
    });

    // Capture real-time stderr (append to action.stderr)
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', (data: string) => {
        action.stderr += data;
    });

    // On process close, remove from record
    child.on('close', (code) => {
        console.log(`[${processKey}] exited with code ${code}`);
        delete childProcesses[processKey];

        // If path references a file, read it into assets
        if (action.path) {
            const fullPath = path.join(projectPath, action.path.replace(/^.\//, ''));
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    const fileContents = fs.readFileSync(fullPath, 'utf-8');
                    codeGenPrompt.details.assets[action.path] = fileContents;
                    console.log(`Upserted asset for file: ${action.path}`);
                } else {
                    console.log(`Skipping read. Path is a directory or non-file: ${fullPath}`);
                }
            } catch (err: any) {
                console.warn(`Error reading file at "${action.path}": ${err.message}`);
            }
        }
    });

    // On error, record the error in stderr
    child.on('error', (err) => {
        console.error(`[${processKey}] error: ${err.message}`);
        action.stderr += `\n[ERROR] ${err.message}`;
        delete childProcesses[processKey];
    });
}

/**
 * Creates a Request, ensures size limit, logs it, and sends to server.
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

    request = ensureRequestSizeLimit(request, 15000);

    console.log(`Round ${roundCounter}`);
    currentRoundRequest = request;

    roundLogs.push({
        type: "request",
        data: JSON.parse(JSON.stringify(request)),
    });
    writeLogsToFile();

    ws!.send(JSON.stringify({ route: 'chat', payload: request }));
}

/**
 * Graceful shutdown: kill child processes, close WebSocket, and exit after all processes close.
 */
function cleanup() {
    console.log("\nGracefully shutting down...");

    const killPromises: Promise<void>[] = [];
    for (const key of Object.keys(childProcesses)) {
        const child = childProcesses[key];
        console.log(`Terminating process [${key}] with SIGTERM...`);

        const p = new Promise<void>((resolve) => {
            child.once('close', () => {
                console.log(`[${key}] closed.`);
                resolve();
            });
            child.kill('SIGTERM');
        });
        killPromises.push(p);
    }

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
            console.error("Error closing child processes:", err);
            process.exit(1);
        });
}

// Handle Ctrl+C
process.on('SIGINT', cleanup);

/**
 * Main function
 */
async function main() {
    currentProjectName = await askQuestion("Enter your project name: ");
    const startTime = new Date().toISOString().replace(/:/g, '-');
    const logFileName = `${currentProjectName}-[${startTime}].log`;
    logFilePath = path.resolve(process.cwd(), 'logs', logFileName);

    // Initialize empty logs
    roundLogs = [];
    fs.writeFileSync(logFilePath, JSON.stringify(roundLogs, null, 2));
    console.log(`Logging to: ${logFilePath}`);

    const projectPath = path.resolve(process.cwd(), 'projects', currentProjectName);
    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
        console.log(`Created project directory: ${projectPath}`);
    } else {
        console.log(`Project directory already exists: ${projectPath}`);
    }

    const goal = await askQuestion("Enter your goal: ");
    let history: Action[] = [];

    ws = new WebSocket('wss://localhost:3000', {
        rejectUnauthorized: false,
    });

    ws.on('open', () => {
        console.log("Connected to WebSocket server.");
        sendNextPrompt(goal, history, codeGenPrompt as CodeGenPrompt);
    });

    ws.on('message', async (data: WebSocket.Data) => {
        try {
            const messageStr = typeof data === 'string' ? data : data.toString();
            let response: { actions: Action[] } = JSON.parse(messageStr);

            if (Array.isArray(response)) {
                response = { actions: response };
            }

            console.log(`Round ${roundCounter} Response has ${response.actions.length} actions`);

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

            sendNextPrompt(goal, history, codeGenPrompt as CodeGenPrompt);
        } catch (err) {
            console.error("Error processing WebSocket message:", err);
        }
    });

    ws.on('error', (err) => {
        console.error("WebSocket error:", err);
    });
}

main();
