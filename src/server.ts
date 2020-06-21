import errorHandler from "errorhandler";
import http from "http";
import socketIO from "socket.io";

import app from "./app";
import { SocketEvents, InputData } from "./constants";
import robot from "robotjs";

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

class Server {
    public server: http.Server = null;
    public io: socketIO.Server = null;
    private host: socketIO.Socket = null;
    private client: socketIO.Socket = null;
    private connections: socketIO.Socket[] = [];
    private hostScreenSize: {width: number; height: number} = null;
    private lastCommand: InputData = null;

    constructor() {
        // Express and socketio will run on the same port. Http is the intermediary.
        this.server = new http.Server(app);
        this.io = socketIO(this.server);
        this.io.on(SocketEvents.connection, this.addSocketListeners.bind(this));
        this.io.on(SocketEvents.error, (e: any) => console.error("Error:",e));
        // Start Express server.
        this.server.listen(app.get("port"), "0.0.0.0", () => {
            console.log(
                "  App is running at http://localhost:%d in %s mode",
                app.get("port"),
                app.get("env")
            );
            console.log("  Press CTRL-C to stop\n");
        });
    }

    private addSocketListeners(socket: socketIO.Socket) {
        console.log("A user connected:", socket.id);
        socket.on(SocketEvents.disconnect, this.handleDisconnect.bind(this, socket));
        socket.on(SocketEvents.message, (msg: string) => this.handleMessage(msg, socket));
        socket.on(SocketEvents.becomeClient, this.becomeClient.bind(this, socket));
        socket.on(SocketEvents.becomeHost, this.becomeHost.bind(this, socket));
        socket.on(SocketEvents.messageClient, (data: string) => this.messageClient(data, socket));
        socket.on(SocketEvents.messageHost, (data: string) => this.messageHost(data, socket));
        socket.on(SocketEvents.serverData, (data: string) => this.serverData(data));
        this.connections.push(socket);
    }

    private handleDisconnect(socket: socketIO.Socket) {
        console.log("A user disconnected:", socket.id);
        let otherParty: socketIO.Socket = null;
        let who: string = "";
        if (this.client && this.host && [this.host.id, this.client.id].includes(socket.id)) {
            switch(socket.id) {
                case this.host.id:
                    console.log("Removed from host.");
                    otherParty = this.client;
                    who = "host";
                    this.host = null;
                    break;
                case this.client.id:
                    console.log("Removed from client.");
                    otherParty = this.host;
                    who = "client";
                    this.client = null;
                    break;
            }
        } else if (this.host && this.host.id === socket.id) {
            console.log("Removed from host.");
            this.host = null;
            this.lastCommand = null;
            this.hostScreenSize = null;
        } else if (this.client && this.client.id === socket.id) {
            console.log("Removed from client.");
            this.client = null;
        }
        const index: number = this.connections.findIndex(s => s.id === socket.id);
        this.connections.splice(index, 1);
        if (otherParty) {
            console.log(`The ${who} has disconnected.`);
            otherParty.disconnect(true);
        }
    }

    private becomeClient(socket: socketIO.Socket) {
        if (this.client) {
            socket.emit(SocketEvents.error, "A client already exists.");
            return;
        }
        this.client = socket;
        console.log(`${socket.id} became client.`);
        this.clientHostCheck();
    }

    private becomeHost(socket: socketIO.Socket) {
        if (this.host) {
            socket.emit(SocketEvents.error, "A host already exists.");
            return;
        }
        this.host = socket;
        this.hostScreenSize = robot.getScreenSize();
        console.log(`${socket.id} became host.`);
        this.clientHostCheck();
    }

    private clientHostCheck() {
        if (this.host && this.client) {
            console.log("There's a host and a client.");
            this.host.emit(SocketEvents.clientHostExists);
            this.client.emit(SocketEvents.clientHostExists);
        }
    }

    private messageClient(data: string, socket: socketIO.Socket) {
        if (!this.client) {
            socket.emit(SocketEvents.error, "There is no client.");
            return;
        }
        this.client.emit(SocketEvents.message, data);
    }

    private messageHost(data: string, socket: socketIO.Socket) {
        if (!this.host) {
            socket.emit(SocketEvents.error, "There is no host.");
            return;
        }
        this.host.emit(SocketEvents.message, data);
    }

    private handleMessage(msg: string, socket: socketIO.Socket) {
        console.log(`User ${socket.id} says: ${msg}`);
        socket.emit(SocketEvents.message, "Hello!");
    }

    private serverData(data: string) {
        if (!data||!this.hostScreenSize) {
            return;
        }
        const lastMouseToggled: boolean = this.lastCommand ? this.lastCommand.lMouseDown : false;
        this.lastCommand = JSON.parse(data);
        // Only toggle the mouse when it is needed.
        if (this.lastCommand.lMouseDown != lastMouseToggled) {
            robot.mouseToggle(this.lastCommand.lMouseDown ? "down" : "up");
        }
        if (this.lastCommand.lMouseDown) {
            robot.dragMouse(this.lastCommand.x * this.hostScreenSize.width, this.lastCommand.y * this.hostScreenSize.height);
        } else {
            robot.moveMouse(this.lastCommand.x * this.hostScreenSize.width, this.lastCommand.y * this.hostScreenSize.height);
        }
    }
}

const server = new Server().server;
export default server;
