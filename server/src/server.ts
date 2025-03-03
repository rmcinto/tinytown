import dotenv from 'dotenv';
dotenv.config({ override: true });

import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * Dynamically loads the appropriate service for handling requests.
 * @param {string} type - The request type ("http" or "ws").
 * @param {string} route - The API route (e.g., "chat", "summary").
 * @param {string} message - The user's message.
 * @param {(error: Error | null, response?: string) => void} callback - Callback function for response handling.
 */
const handleMessage = async (
    type: 'http' | 'ws',    route: string,
    message: string,
    callback: (error: Error | null, response: string | null) => void
) => {
    try {
        console.log(`[${type.toUpperCase()}] Route: /${route} | Message:`, message);

        const servicePath = path.join(__dirname, 'services', `${route}.ts`);

        if (!fs.existsSync(servicePath)) {
            throw new Error(`Service for route '${route}' not found.`);
        }

        const service = await import(servicePath);

        if (typeof service.handleRequest !== 'function') {
            throw new Error(`Service '${route}' must export a 'handleRequest' function.`);
        }

        const response = await service.handleRequest(message);
        callback(null, response);
    } 
    catch (error) {
        console.error(`[${type.toUpperCase()}] Error:`, error);
        callback(error as Error, null);
    }
};

// --- Catch-All HTTP Route ---
app.post('/:route', async (req: Request, res: Response): Promise<void> => {
    const { route } = req.params;
    const { message } = req.body;

    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    handleMessage('http', route, message, (err, response) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ response });
    });
});

// --- WebSocket Server ---
wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: string) => {
        try {
            const parsedData = JSON.parse(data);
            const { route, message } = parsedData;

            if (!route || !message) {
                return ws.send(JSON.stringify({ error: 'Route and message are required' }));
            }

            handleMessage('ws', route, message, (err, response) => {
                if (err) return ws.send(JSON.stringify({ error: err.message }));
                ws.send(JSON.stringify({ response }));
            });
        } 
        catch (error) {
            ws.send(JSON.stringify({ error: 'Invalid message format. Use JSON: { "route": "chat", "message": "Hello" }' }));
        }
    });

    ws.on('close', () => console.log('WebSocket client disconnected'));
});

// --- Start the Server ---
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
