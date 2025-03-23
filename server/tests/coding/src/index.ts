import codeGenPrompt from '../prompts/code-gen.json';
import WebSocket from 'ws';
import * as readline from 'readline';
import { v4 as uuidV4 } from "uuid";
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// --------------------------------------------------------------------
// Interfaces & Types
// --------------------------------------------------------------------

// We store each log entry as { type: "request" | "response", data: ... }
interface LogEntry {
    type: "request" | "response";
    data: any; // "data" can contain the request, the response, or both
}

// Local log array for this run
let roundLogs: LogEntry[] = [];

// The current request awaiting a response (if any)
let currentRoundRequest: Request | null = null;

// Path to the log file for this run
let logFilePath: string = "";

// For example, "MyProject"
let currentProjectName = "default";

// Track child processes so we can kill them or track them
const childProcesses: Record<string, ChildProcessWithoutNullStreams> = {};

// Ensure we have a logs folder
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs', { recursive: true });
}

// Write the in-memory roundLogs to disk
function writeLogsToFile() {
    fs.writeFileSync(logFilePath, JSON.stringify(roundLogs, null, 2));
}

// ---------------
// Code-Gen JSON Schema
// ---------------

// Base type for actions
interface BaseAction {
    actionType: "run-command" | "think";
    description: string;
    reasoning: string;
}

// Action for commands
interface RunCommandAction extends BaseAction {
    actionType: "run-command";
    command: string;
    path?: string;
    parameter?: string;
    processId?: number; // Keep track if it's still running
}

// Action for "think"
interface ThinkAction extends BaseAction {
    actionType: "think";
    cognition: string;
}

type Action = RunCommandAction | ThinkAction;

/**
 * We define a type for tracking live console processes.
 * This is stored in codeGenPrompt.details.consoleEntries.
 */
interface ConsoleEntry {
    processId: number;
    command: string;
    stdout: string;
    stderr: string;
    startTime: string;
    endTime?: string;
}

// The request object from code-gen JSON schema
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

        // Add consoleEntries to track running processes
        consoleEntries?: Record<string, ConsoleEntry>;
    };
    history: Action[];
    id: string;
}

// codeGenPrompt JSON structure
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

        // Add consoleEntries here as well
        consoleEntries?: Record<string, ConsoleEntry>;
    };
    history: Action[];
}

// Summarize older actions, ignoring any run-command that still has a processId
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
 * We keep the request under a certain size. If it's too large,
 * we remove older actions (except any with processId != undefined).
 */
function ensureRequestSizeLimit(request: Request, sizeLimit = 15000): Request {
    let requestStr = JSON.stringify(request);
    if (requestStr.length <= sizeLimit) {
        return request;
    }

    // We'll keep the last 20 actions in detail.
    // Summarize older ones that do NOT have a processId.
    const keepCount = 20;

    // Separate actions that are 'in-progress' from others
    const inProgress = request.history.filter(
        (a) => a.actionType === 'run-command' && (a as RunCommandAction).processId
    );
    const doneActions = request.history.filter(
        (a) => !(a.actionType === 'run-command' && (a as RunCommandAction).processId)
    );

    // Summarize older doneActions beyond keepCount
    if (doneActions.length > keepCount) {
        const olderSegment = doneActions.slice(0, doneActions.length - keepCount);
        const remain = doneActions.slice(-keepCount);
        const summary = summarizeActions(olderSegment);
        // Rebuild history => in-progress + remain + summary
        // We'll put summary at front for convenience
        request.history = [summary, ...remain, ...inProgress];
    } else {
        // Just re-append them in the right order
        request.history = [...doneActions, ...inProgress];
    }

    requestStr = JSON.stringify(request);
    if (requestStr.length > sizeLimit) {
        console.warn(`Even after summarizing, request is still too big (${requestStr.length} chars).`);
    }
    return request;
}

// Round counter & WebSocket
let roundCounter = 0;
let ws: WebSocket | undefined;

// Setup readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Ask a question from the CLI
function askQuestion(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, (answer) => resolve(answer));
    });
}

/**
 * Spawns a child process. We'll:
 * 1) Add a console entry in codeGenPrompt.details.consoleEntries to track stdout/stderr
 * 2) Clear processId upon exit
 * 3) Summarize the console entry and push it to codeGenPrompt.history
 * 4) Remove from consoleEntries
 */
function spawnProcess(
    action: RunCommandAction,
    projectPath: string,
    codeGen: CodeGenPrompt
) {
    // Ensure consoleEntries is defined
    if (!codeGen.details.consoleEntries) {
        codeGen.details.consoleEntries = {};
    }

    const consoleKey = `${action.command}-${Date.now()}`;
    const child = spawn('wsl', ['bash', '-c', action.command], {
        cwd: projectPath,
        shell: false
    });

    childProcesses[consoleKey] = child;
    action.processId = child.pid;

    // Create a console entry
    codeGen.details.consoleEntries[consoleKey] = {
        processId: child.pid || 0,
        command: action.command,
        stdout: "",
        stderr: "",
        startTime: new Date().toISOString()
    };
    const entry = codeGen.details.consoleEntries[consoleKey];

    // Capture stdout/stderr
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (data: string) => {
        entry.stdout += data;
    });
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', (data: string) => {
        entry.stderr += data;
    });

    child.on('close', (code) => {
        console.log(`[${consoleKey}] ended with code ${code}`);
        delete childProcesses[consoleKey];

        // Clear the process ID
        action.processId = undefined;

        // Mark the end time
        entry.endTime = new Date().toISOString();

        // Summarize final logs as a new "think" in codeGen.history
        const summary: ThinkAction = {
            actionType: 'think',
            cognition: `Process ended: PID ${entry.processId}\nCommand: ${entry.command}\nstdout:\n${entry.stdout}\nstderr:\n${entry.stderr}`,
            description: "A summary of the completed console process",
            reasoning: "Captured final logs from the process before removing the console entry"
        };
        codeGen.history.push(summary);

        // Remove from consoleEntries
        delete codeGen.details.consoleEntries![consoleKey];

        // If the action references a path, read the file
        if (action.path) {
            const fullPath = path.join(projectPath, action.path.replace(/^.\//, ''));
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    const fileContents = fs.readFileSync(fullPath, 'utf-8');
                    codeGen.details.assets[action.path] = fileContents;
                    console.log(`Upserted asset for file: ${action.path}`);
                }
            } catch (err: any) {
                console.warn(`Error reading file at "${action.path}": ${err.message}`);
            }
        }
    });

    child.on('error', (err) => {
        console.error(`[${consoleKey}] error: ${err.message}`);
        entry.stderr += `\n[ERROR] ${err.message}`;
        delete childProcesses[consoleKey];
        action.processId = undefined;
    });
}

/**
 * Builds a request, ensures size limit, logs it, sends it to the server.
 */
function sendNextPrompt(goal: string, history: Action[], codeGen: CodeGenPrompt): void {
    roundCounter++;
    let request: Request = {
        instructions: codeGen.instructions,
        goal: [goal],
        examples: codeGen.examples,
        details: codeGen.details,
        history: history,
        id: uuidV4()
    };

    request = ensureRequestSizeLimit(request);

    console.log(`Round ${roundCounter}`);
    currentRoundRequest = request;

    roundLogs.push({
        type: "request",
        data: JSON.parse(JSON.stringify(request))
    });
    writeLogsToFile();

    ws!.send(JSON.stringify({ route: 'chat', payload: request }));
}

/**
 * Graceful shutdown. Kill child processes, close WebSocket, exit after all processes close.
 */
function cleanup() {
    console.log("\nShutting down gracefully...");
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
            console.log("All child processes terminated. Exiting...");
            rl.close();
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            process.exit(0);
        })
        .catch((err) => {
            console.error("Error while closing processes:", err);
            process.exit(1);
        });
}

// Catch Ctrl+C
process.on('SIGINT', cleanup);

// Main entry
async function main() {
    // Prompt user for a project name
    currentProjectName = await askQuestion("Enter your project name: ");
    // Create the log file
    const startTime = new Date().toISOString().replace(/:/g, '-');
    logFilePath = path.resolve(process.cwd(), 'logs', `${currentProjectName}-[${startTime}].log`);
    roundLogs = [];
    fs.writeFileSync(logFilePath, JSON.stringify(roundLogs, null, 2));
    console.log(`Logging to: ${logFilePath}`);

    // Make sure the project folder exists
    const projectPath = path.resolve(process.cwd(), 'projects', currentProjectName);
    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
        console.log(`Created project directory: ${projectPath}`);
    } 
    else {
        console.log(`Project directory already exists: ${projectPath}`);
    }

    // Prompt user for the goal
    const goal = await askQuestion("Enter your goal: ");
    let history: Action[] = [];

    // Connect to WebSocket
    ws = new WebSocket('wss://localhost:3000', {
        rejectUnauthorized: false
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
            } 
            else {
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
        } 
        catch (err) {
            console.error("Error processing message from WebSocket:", err);
        }
    });

    ws.on('error', (err) => {
        console.error("WebSocket error:", err);
    });
}

main();