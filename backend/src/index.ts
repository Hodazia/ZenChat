import { WebSocketServer, WebSocket } from 'ws'

interface User {
    socket: WebSocket;
    roomId: string;
    name: string;
    icon: string;
}

let allSockets: User[] = [];

// Generate a random icon (emoji) for each user
function generateUserIcon(): string {
    const icons = ['👨', '👩', '👶', '👴', '👵', '👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🎨', '👩‍🎨', '🧑‍🎨', '👨‍🍳', '👩‍🍳', '🧑‍🍳'];
    return icons[Math.floor(Math.random() * icons.length)];
}

const PORT = parseInt(process.env.PORT || '8080', 10);
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server starting on port ${PORT}`);

wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection established");

    ws.on("message", (msg: string) => {
        try {
            console.log("Received message:", msg.toString());
            let parsedMessage = JSON.parse(msg.toString());
            
            if (parsedMessage.type === "join") {
                console.log("Join request received:", parsedMessage.payload);
                const userIcon = generateUserIcon();
                const newUser = {
                    socket: ws,
                    roomId: parsedMessage.payload.roomId,
                    name: parsedMessage.payload.name,
                    icon: userIcon
                };
                allSockets.push(newUser);

                // Notify all users in the room about the new user
                const roomUsers = allSockets.filter(user => user.roomId === parsedMessage.payload.roomId);
                const userCount = roomUsers.length;

                console.log(`Broadcasting join message to ${userCount} users in room ${parsedMessage.payload.roomId}`);
                roomUsers.forEach(user => {
                    user.socket.send(JSON.stringify({
                        type: "system",
                        payload: {
                            message: `${parsedMessage.payload.name} joined the room`,
                            userCount: userCount,
                            users: roomUsers.map(u => ({ name: u.name, icon: u.icon }))
                        }
                    }));
                });
            }

            if (parsedMessage.type === "chat") {
                const currentUser = allSockets.find(user => user.socket === ws);
                if (!currentUser) {
                    console.error("Chat message from unknown user");
                    return;
                }

                console.log(`Broadcasting chat message from ${currentUser.name} in room ${currentUser.roomId}`);
                allSockets
                    .filter(user => user.roomId === currentUser.roomId)
                    .forEach(user => {
                        user.socket.send(JSON.stringify({
                            type: "chat",
                            payload: {
                                name: currentUser.name,
                                message: parsedMessage.payload.message,
                                icon: currentUser.icon
                            }
                        }));
                    });
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });

    ws.on("close", () => {
        console.log("WebSocket connection closed");
        const leavingUser = allSockets.find(user => user.socket === ws);
        if (leavingUser) {
            console.log(`User ${leavingUser.name} leaving room ${leavingUser.roomId}`);
            allSockets = allSockets.filter(user => user.socket !== ws);
            
            // Notify remaining users in the room
            const roomUsers = allSockets.filter(user => user.roomId === leavingUser.roomId);
            const userCount = roomUsers.length;

            console.log(`Notifying ${userCount} remaining users in room ${leavingUser.roomId}`);
            roomUsers.forEach(user => {
                user.socket.send(JSON.stringify({
                    type: "system",
                    payload: {
                        message: `${leavingUser.name} left the room`,
                        userCount: userCount,
                        users: roomUsers.map(u => ({ name: u.name, icon: u.icon }))
                    }
                }));
            });
        }
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
    });
});

