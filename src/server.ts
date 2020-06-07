import errorHandler from "errorhandler";
import http from "http";
import socket from "socket.io";

import app from "./app";

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

// Express and socketio will run on the same port. Http is the intermediary.
const server = new http.Server(app);
const io = socket(server);

io.on("connection", (socket: socket.Socket) => {
    console.log("A user connected");
    addSocketListeners(socket);
});

function addSocketListeners(socket:socket.Socket) {
    socket.on("disconnect", handleDisconnect);
    socket.on("message", handleMessage);
}

function handleDisconnect(socket: socket.Socket) {
    console.log("A user disconnected");
}

function handleMessage(msg: any) {
    console.log("A user message", msg);
}

/**
 * Start Express server.
 */
server.listen(app.get("port"), () => {
    console.log(
        "  App is running at http://localhost:%d in %s mode",
        app.get("port"),
        app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
});

export default server;
