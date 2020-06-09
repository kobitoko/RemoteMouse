import errorHandler from "errorhandler";
import http from "http";
import socketIO from "socket.io";

import app from "./app";
import { SocketEvents, PeerEvents } from "./constants";

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

class Server {
    public server: http.Server = null;
    public io: socketIO.Server = null;
    private peerData: string = null;

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
        socket.on(SocketEvents.setPeerData, this.setPeerData.bind(this));
        socket.on(SocketEvents.setPeerTrickleICE, this.setPeerTrickleICE.bind(this));
        socket.on(SocketEvents.getPeerData, this.getPeerData.bind(this, socket));
    }

    private handleDisconnect(socket: socketIO.Socket) {
        console.log("A user disconnected");
    }

    private setPeerData(dataString: string) {
        this.peerData = dataString;
    }

    private setPeerTrickleICE(dataString: string) {
        this.io.sockets.emit(SocketEvents.peerUpdatedICECandidate, dataString);
    }

    //TODO: figure out how to enable webrtc on local network https://stackoverflow.com/questions/32171367/webrtc-on-local-network

    private getPeerData(sender: socketIO.Socket) {
        console.log("socketid:",sender.id)
        sender.emit(SocketEvents.getPeerData, this.peerData);
    }

    private handleMessage(msg: any) {
        console.log("A user message:", msg);
    }
}

const server = new Server().server;
export default server;
