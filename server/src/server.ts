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

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * Dynamically loads the appropriate service for handling requests.
 * @param {string} type - The request type ("http" or "ws").
 * @param {string} route - The API route (e.g., "chat", "summary").
 * @param {string} message - The user's message.
 * @param {(error: Error | null, response: string | null) => void} callback - Callback function for response handling.
 */
const handleMessage = async (
    type: 'http' | 'ws',
    route: string,
    message: any,
    callback: (error: Error | null, response: string | null) => void
) => {
    try {
        console.log(`[${type.toUpperCase()}] Route: /${route}`);

        //we don't want a directory traversal (or path traversal) vulnerability 
        if (route[0] === ".") {
            throw new Error(`Invalid route '${route}'.`);
        }

        const servicePath = path.join(__dirname, 'services', `${route}.ts`);

        if (!fs.existsSync(servicePath)) {
            throw new Error(`Service for route '${route}' not found.`);
        }

        const service = await import(servicePath);

        if (typeof service.handleRequest !== 'function') {
            throw new Error(`Service '${route}' must export a 'handleRequest' function.`);
        }

        if (typeof message !== "string") {
            message = JSON.stringify(message);
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
    const payload = req.body;

    if (!payload) {
        res.status(400).json({ error: 'Payload is required' });
        return;
    }

    handleMessage('http', route, payload, (err, response) => {
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

    ws.on('message', async (data: any) => {
        try {
            console.log('Messasge recieved');
            const text = data instanceof Buffer ? data.toString('utf8') : data;
            const parsedData = JSON.parse(text);
            const { route, payload } = parsedData;
            if (!route || !payload) {
                return ws.send(JSON.stringify({ error: 'Route and message are required' }));
            }
            handleMessage('ws', route, payload, (err, response) => {
                if (err) return ws.send(JSON.stringify({ error: err.message }));
                ws.send(JSON.stringify({ response }));
            });
        } 
        catch (error) {
            ws.send(JSON.stringify({ error: 'Invalid message format. Use JSON: { "route": "chat", "payload": "Hello" }' }));
        }
        finally {
            console.log('Messasge processed');
        }
    });

    ws.on('close', () => console.log('WebSocket client disconnected'));
});

// --- Start the Server ---
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
