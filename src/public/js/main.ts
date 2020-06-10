import SocketIOClient from "socket.io-client";
import SimplePeer from "simple-peer";
import { SocketEvents, PeerEvents } from "../../constants";

type DisplayMediaOptions = {
    video: { cursor: string };
    audio: boolean;
};

class RemoteMouse {
    public displayMediaOptions: DisplayMediaOptions = null;
    public peer: SimplePeer.Instance = null;
    private captureStream: MediaStream = null;
    private socket: SocketIOClient.Socket = null;
    private peerInitiatorData: string[] = [];

    constructor(displayMediaOptions?: DisplayMediaOptions) {
        this.displayMediaOptions = displayMediaOptions
            ? displayMediaOptions
            : {
                  video: {
                      cursor: "always",
                  },
                  audio: false,
              };
        console.log("Constructed!");

        var peer1 = new SimplePeer({ initiator: true })
        var peer2 = new SimplePeer()

        peer1.on('signal', data => {
        // when peer1 has signaling data, give it to peer2 somehow
        peer2.signal(data)
        })

        peer2.on('signal', data => {
        // when peer2 has signaling data, give it to peer1 somehow
        peer1.signal(data)
        })

        peer1.on('connect', () => {
        // wait for 'connect' event before using the data channel
        peer1.send('hey peer2, how is it going?')
        })

        peer2.on('data', data => {
        // got a data channel message
        console.log('got a message from peer1: ' + data)
        })
    }

    public handleMouseMoved(e: MouseEvent) {
        console.log(
            "Mouse move",
            e.offsetX,
            e.offsetY,
            (e.target as HTMLElement).clientWidth,
            (e.target as HTMLElement).clientHeight,
            e.offsetX / (e.target as HTMLElement).clientWidth,
            e.offsetY / (e.target as HTMLElement).clientHeight
        );
    }

    public handleMouseDown(e: MouseEvent) {
        console.log("Mouse down", e.offsetX, e.offsetY);
    }

    public handleMouseUp(e: MouseEvent) {
        console.log("Mouse up", e.offsetX, e.offsetY);
    }

    private addPeerListeners(peer: SimplePeer.Instance, isHost: boolean) {
        peer.on(PeerEvents.connect, () => {
            console.log("CONNECT");
            peer.send("whatever" + Math.random());
        });
        peer.on(PeerEvents.error, (err) => console.error("Peer error", err));
        peer.on(PeerEvents.data, (data) => {
            console.log("data: " + data);
        });
        if (isHost) {
            peer.on(PeerEvents.signal, (data) => {
                console.log("Sending signal:\n", data);
                this.socket.emit(SocketEvents.setPeerData, JSON.stringify(data));
            });
        } else {
            peer.on(PeerEvents.signal, (data) => {
                console.log("Received peerdata:\n", data);
                this.socket.emit(SocketEvents.replyPeerData, JSON.stringify(data));
            });
            peer.on(PeerEvents.stream, this.receiveStream.bind(this));
        }
    }

    // Sends stream, receives coordinates from mouse.
    public async startHost(): Promise<void> {
        try {
            // navigator.mediaDevices is missing getDisplayMedia: https://github.com/microsoft/TypeScript/issues/33232
            // @ts-ignore
            this.captureStream = await navigator.mediaDevices.getDisplayMedia(this.displayMediaOptions);
        } catch (err) {
            console.error("Error: " + err);
        }
        // TODO: send stream to client.
        this.socket = SocketIOClient("http://localhost:3000");
        this.socket.send("Hello, host here!");
        // TODO: WebRTC send stream.
        this.peer = new SimplePeer({
            initiator: true,
            trickle: true,
            stream: this.captureStream
        });
        this.addPeerListeners(this.peer, true);
    }

    // Receives stream, sends out coordinates from mouse.
    public async startClient(): Promise<void> {
        this.socket = SocketIOClient("http://localhost:3000");
        this.socket.send("Hello, client here!");
        this.peer = new SimplePeer({
            initiator: false,
            trickle: true
        });
        this.socket.on(SocketEvents.getPeerData, this.receivePeerData.bind(this))
        this.addPeerListeners(this.peer, false);
        // Ready to receive peer data.
        this.socket.emit(SocketEvents.getPeerData);
    }

    private async receivePeerData(data :string) {
        const newData: string[] = JSON.parse(data);
        const newUniqueData: string[] = newData.filter(data => !this.peerInitiatorData.includes(data));
        if (newUniqueData.length > 0) {
            this.peerInitiatorData.push(...newUniqueData);
        }
        for(const candidate of newUniqueData) {
            this.peer.signal(candidate);
        }
    }

    private async receiveStream(stream:MediaStream):Promise<void> {
        const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
        if (videoElem.srcObject) {
            console.log("scrObj has video??")
            return;
        }
        videoElem.srcObject = stream;
        await videoElem.play();
        videoElem.addEventListener("mousemove", this.handleMouseMoved);
        videoElem.addEventListener("mousedown", this.handleMouseDown);
        videoElem.addEventListener("mouseup", this.handleMouseUp);
        // Fullscreen the container, if the ratio doesn't fit the video's height, the video element's height still matches the video source
        document.getElementById("video-container").requestFullscreen();
    }

    public stopCapture(): void {
        const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
        videoElem.removeEventListener("mousemove", this.handleMouseMoved);
        videoElem.removeEventListener("mousedown", this.handleMouseDown);
        videoElem.removeEventListener("mouseup", this.handleMouseUp);
        this.socket.disconnect();
        if (!!videoElem.srcObject) {
            const tracks = (videoElem.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
            videoElem.srcObject = null;
        }
    }
}
declare global {
    interface Window { app: RemoteMouse}
}

document.addEventListener("DOMContentLoaded", async () => {
    const remoteMouse = new RemoteMouse();
    const startHostBtn = document.getElementById("start-host");
    const startClientBtn = document.getElementById("start-client");
    const stopBtn = document.getElementById("stop");
    startHostBtn.addEventListener("click", () => remoteMouse.startHost());
    startClientBtn.addEventListener("click", () => remoteMouse.startClient());
    stopBtn.addEventListener("click", () => remoteMouse.stopCapture());
    console.log("ready");
    window.app = remoteMouse;
});