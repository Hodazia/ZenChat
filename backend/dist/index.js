"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
let allSockets = []; // [{socket1,123},{socket2,123},{socket1,523}]
const wss = new ws_1.WebSocketServer({ port: 8080 });
wss.on("connection", (ws) => {
    ws.on("message", (msg) => {
        //@ts-ignore
        let parsedMessage = JSON.parse(msg);
        if (parsedMessage.payload.type == "join") {
            allSockets.push({
                socket: ws,
                roomId: parsedMessage.payload.roomId
            });
        }
        if (parsedMessage.payload.type == "chat") {
            // now since the payload is of chat, we have to broadcast the messages to everyone
            // first we have to find the current socket and also its rooom
            let currentUser = null;
            for (let i = 0; i < allSockets.length; i++) {
                if (allSockets[i].socket == ws) {
                    currentUser = allSockets[i];
                }
            }
            //Now once we have found the current socket , now we have to find all the other sockets of the same/current room and send the message
            allSockets.map((e) => {
                if (e.roomId == (currentUser === null || currentUser === void 0 ? void 0 : currentUser.roomId)) {
                    e.socket.send(JSON.stringify({
                        name: parsedMessage.payload.name,
                        message: parsedMessage.payload.message,
                    }));
                }
            });
        }
    });
});
