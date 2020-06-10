import errorHandler from "errorhandler";
import http from "http";
import socketIO from "socket.io";

import app from "./app";
import { SocketEvents, PeerEvents } from "./constants";

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

// TODO: Rewrite all this: 
// CONNECT both via socket immediately, then when one clicks host, this will remember, but won't tell host to start rtc until it detects client
// when one clicks client, server will remember and wait for a host.
// When both present, this sends host to start rtc and begin communicating to client.
// This will pass signals between host/client until they connect.

class Server {
    public server: http.Server = null;
    public io: socketIO.Server = null;
    private peerData: string[] = [];
    private host: socketIO.Socket = null;

    constructor() {
        // Express and socketio will run on the same port. Http is the intermediary.
        this.server = new http.Server(app);
        this.io = socketIO(this.server);
        this.io.on("connection", this.addSocketListeners.bind(this));
        // Start Express server.
        this.server.listen(app.get("port"), () => {
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
        socket.on(SocketEvents.disconnect, this.handleDisconnect.bind(this));
        socket.on(SocketEvents.message, this.handleMessage.bind(this));
        socket.on(SocketEvents.setPeerData, (data:string) => this.setPeerData(data, socket));
        socket.on(SocketEvents.getPeerData, this.getPeerData.bind(this, socket));
        socket.on(SocketEvents.replyPeerData,  this.replyPeerData.bind(this));
    }

    private handleDisconnect(socket: socketIO.Socket) {
        console.log("A user disconnected:", socket.id);
    }

    private setPeerData(dataString: string, socket: socketIO.Socket) {
        this.peerData.push(dataString);
        this.host = socket;
    }

    //TODO: figure out how to enable webrtc on local network https://stackoverflow.com/questions/32171367/webrtc-on-local-network

    private getPeerData(sender: socketIO.Socket) {
        sender.emit(SocketEvents.getPeerData, JSON.stringify(this.peerData));
    }

    private replyPeerData(dataString:string) {
        this.host.emit(SocketEvents.replyPeerData,dataString);
    }

    private handleMessage(msg: any) {
        console.log("A user message:", msg);
    }
}

const server = new Server().server;
export default server;
