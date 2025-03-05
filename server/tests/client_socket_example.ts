import WebSocket from 'ws';

console.log("Client socket example started");

// For development with self-signed certificates, you can disable certificate verification
const ws = new WebSocket("wss://localhost:3000", {
  rejectUnauthorized: false,
});

ws.on('open', () => {
    console.log("Client socket example opening");
    ws.send(JSON.stringify({ route: "chat", payload: "Hello WebSocket!" }));
});

ws.on('message', (data) => {
    // Convert the Buffer to a string if necessary
    const text = data instanceof Buffer ? data.toString('utf8') : data;
    console.log("Response:", text);
});

ws.on('error', (error) => {
    console.error("WebSocket error:", error);
});