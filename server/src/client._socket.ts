const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
    ws.send(JSON.stringify({ route: "chat", message: "Hello WebSocket!" }));
};

ws.onmessage = (event) => {
    console.log("Response:", event.data);
};