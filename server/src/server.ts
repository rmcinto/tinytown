import dotenv from 'dotenv';
dotenv.config({ override: true });

import express, { Request, Response } from 'express';
import cors from 'cors';
import https from 'https';
import WebSocket, { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';

// Read SSL certificate and key files
const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
};

const app = express();
const server = https.createServer(options, app);
const wss = new WebSocketServer({ server });

const PORT = (process.env.PORT as unknown as number) || 3000;
const HOST = process.env.HOST || 'localhost';

app.use(cors());
app.use(express.json());

/**
 * Dynamically loads the appropriate interface for handling requests.
 * @param {string} type - The request type ("http" or "ws").
 * @param {string} route - The API route (e.g., "chat", "summary").
 * @param {any} message - The user's message.
 * @param {(eresponse: any) => void} callback - Callback function for response handling.
 */
const handleMessage = async (
    type: 'http' | 'ws',
    route: string,
    message: any,
    callback: (response: any) => void
) => {
    try {
        console.log(`[${type.toUpperCase()}] Route: /${route}`);

        //we don't want a directory traversal (or path traversal) vulnerability 
        if (route[0] === ".") {
            throw new Error(`Invalid route '${route}'.`);
        }

        const servicePath = path.join(__dirname, 'interfaces', `${route}.ts`);

        if (!fs.existsSync(servicePath)) {
            throw new Error(`Service for route '${route}' not found.`);
        }

        const handler = await import(servicePath);

        if (typeof handler.handleRequest !== 'function') {
            throw new Error(`Handler '${route}' must export a 'handleRequest' function.`);
        }

        const response = await handler.handleRequest(message);

        callback(response);
    }
    catch (error: any) {
        console.error(`[${type.toUpperCase()}] Error:`, error);
        callback({
            message: error.message || error,
            stack: error.stack
        });
    }
};

// --- Catch-All HTTP Route ---
app.all('/:route', async (req: Request, res: Response): Promise<void> => {
    console.log(`Recieved an HTTP request for route: ${req.params.route}`);

    handleMessage(
        'http', 
        req.params.route, 
        req.body, 
        (response) => res.json(response)
    );

    console.log(`Completed an HTTP request for route: ${req.params.route}`);
});

// --- WebSocket Server ---
wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: any) => {
        console.log('Messasge recieved');
        const text = data instanceof Buffer ? data.toString('utf8') : data;
        let parsedData;
        try {
            parsedData = JSON.parse(text);
        }
        catch (error) {
            ws.send(JSON.stringify({ message: error }));
        }

        handleMessage(
            'ws', 
            parsedData.route, 
            parsedData.payload, 
            (response) => ws.send(JSON.stringify(response))
        );

        console.log('Messasge processed');
    });

    ws.on('close', () => console.log('WebSocket client disconnected'));
});

// --- Start the Server ---
server.listen(PORT, HOST, () => {
    console.log(`Server running on https://${HOST}:${PORT}`);
});
