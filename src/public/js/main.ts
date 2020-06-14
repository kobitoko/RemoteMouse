import SocketIOClient from "socket.io-client";
import SimplePeer from "simple-peer";
import { SocketEvents, PeerEvents, InputData, InputTypes } from "../../constants";

type DisplayMediaOptions = {
    video: { cursor: string };
    audio: boolean;
};

enum Role {
    none = "none",
    host = "host",
    client = "client",
}

class RemoteMouse {
    private socket: SocketIOClient.Socket = null;
    private connectBtn: HTMLElement = null;
    private connectField: HTMLInputElement = null;
    private hostBtn: HTMLElement = null;
    private clientBtn: HTMLElement = null;
    private stopBtn: HTMLElement = null;
    private role: Role = Role.none;

    public displayMediaOptions: DisplayMediaOptions = null;
    public peer: SimplePeer.Instance = null;
    private captureStream: MediaStream = null;

    constructor(displayMediaOptions?: DisplayMediaOptions) {
        this.displayMediaOptions = displayMediaOptions
            ? displayMediaOptions
            : {
                  video: {
                      cursor: "always",
                  },
                  audio: false,
              };
        this.hostBtn = document.getElementById("start-host");
        this.clientBtn = document.getElementById("start-client");
        this.stopBtn = document.getElementById("stop");
        this.connectBtn = document.getElementById("connect");
        this.connectField = document.getElementById("ip") as HTMLInputElement;
        this.connectBtn.addEventListener("click", this.handleConnect.bind(this));
        this.connectField.value = window.location.href;
    }

    private handleConnect(event: MouseEvent) {
        event.preventDefault();
        this.connectBtn.classList.add("disabled");
        this.connectField.setAttribute("disabled", "true");
        this.socket = SocketIOClient(`${this.connectField.value}`);
        this.socket.once(SocketEvents.message, this.firstSocketContact.bind(this));
        this.socket.on(SocketEvents.error, this.handleError.bind(this));
        this.socket.on(SocketEvents.disconnect, () => this.handleError("disconnected."));
        this.socket.send("Hello!");
        // Re-enable connect buttons when there's still no connection after 3s.
        setTimeout(() => {
            if (!this.socket.connected) {
                alert(`Failed to connect to ${this.connectField.value}`);
                this.socket.removeAllListeners();
                this.socket = null;
                this.connectBtn.classList.remove("disabled");
                this.connectField.removeAttribute("disabled");
            }
        }, 3000);
    }

    private firstSocketContact(msg: string) {
        console.log("Server:", msg);
        // Enable client/host buttons.
        this.hostBtn.classList.remove("disabled");
        this.clientBtn.classList.remove("disabled");
        this.socket.on(SocketEvents.clientHostExists, this.startPeer.bind(this));
    }

    private handleError(error: any) {
        console.error("Socket error", error);
        alert(`Refreshing! Socket error: ${error}`);
        this.stopCapture();
        window.location.reload();
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
        this.role = Role.host;
        this.socket.emit(SocketEvents.becomeHost);
        this.hostBtn.classList.add("disabled");
        this.clientBtn.classList.add("disabled");
    }

    // Receives stream, sends out coordinates from mouse.
    public async startClient(): Promise<void> {
        this.role = Role.client;
        this.socket.emit(SocketEvents.becomeClient);
        this.hostBtn.classList.add("disabled");
        this.clientBtn.classList.add("disabled");
    }

    private startPeer() {
        if (this.role === Role.none) {
            console.error("Role of NONE, but received a clientHostExists event?");
            return;
        }
        const isHost: boolean = this.role === Role.host;
        this.peer = new SimplePeer({
            initiator: isHost ? true : false,
            trickle: true,
            stream: isHost ? this.captureStream : null,
        });
        this.addPeerListeners(this.peer);
        this.socket.on(SocketEvents.message, this.processSignal.bind(this));
        this.stopBtn.classList.remove("disabled");
        this.hostBtn.classList.add("disabled");
        this.clientBtn.classList.add("disabled");
        console.log("Ready for peer.");
    }

    private addPeerListeners(peer: SimplePeer.Instance) {
        peer.on(PeerEvents.connect, () => {
            console.log("Connected to peer.");
        });
        peer.on(PeerEvents.error, (err) => console.error("Peer error", err));
        peer.on(PeerEvents.signal, (data) => {
            console.log(`Sending signal to ${this.role}:\n`, data);
            const receiver: SocketEvents = this.role === Role.host ? SocketEvents.messageClient : SocketEvents.messageHost;
            this.socket.emit(receiver, JSON.stringify(data));
        });
        if (this.role === Role.client) {
            peer.on(PeerEvents.stream, this.receiveStream.bind(this));
        }
    }

    private processSignal(data: string) {
        this.peer.signal(JSON.parse(data));
    }

    private async receiveStream(stream: MediaStream): Promise<void> {
        const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
        if (videoElem.srcObject) {
            console.log("scrObj has video??");
            return;
        }
        videoElem.srcObject = stream;
        await videoElem.play();
        videoElem.addEventListener("mousemove", this.handleMouseMoved.bind(this));
        videoElem.addEventListener("mousedown", this.handleMouseDown.bind(this));
        videoElem.addEventListener("mouseup", this.handleMouseUp.bind(this));
        // Fullscreen the container, if the ratio doesn't fit the video's height, the video element's height still matches the video source
        document.getElementById("video-container").requestFullscreen();
    }

    public handleMouseMoved(e: MouseEvent) {
        const mPercentX: number = e.offsetX / (e.target as HTMLElement).clientWidth;
        const mPercentY: number = e.offsetY / (e.target as HTMLElement).clientHeight;
        const data: InputData = { type: InputTypes.mouseMove, x: mPercentX, y: mPercentY };
        this.socket.emit(SocketEvents.serverData, JSON.stringify(data));
    }

    public handleMouseDown(e: MouseEvent) {
        const mPercentX: number = e.offsetX / (e.target as HTMLElement).clientWidth;
        const mPercentY: number = e.offsetY / (e.target as HTMLElement).clientHeight;
        const data: InputData = { type: InputTypes.mouseDown, x: mPercentX, y: mPercentY };
        this.socket.emit(SocketEvents.serverData, JSON.stringify(data));
    }

    public handleMouseUp(e: MouseEvent) {
        const mPercentX: number = e.offsetX / (e.target as HTMLElement).clientWidth;
        const mPercentY: number = e.offsetY / (e.target as HTMLElement).clientHeight;
        const data: InputData = { type: InputTypes.mouseUp, x: mPercentX, y: mPercentY };
        this.socket.emit(SocketEvents.serverData, JSON.stringify(data));
    }

    public stopCapture(): void {
        const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
        videoElem.removeEventListener("mousemove", this.handleMouseMoved);
        videoElem.removeEventListener("mousedown", this.handleMouseDown);
        videoElem.removeEventListener("mouseup", this.handleMouseUp);
        this.role = Role.none;
        if (this.peer) {
            this.peer.destroy();
        }
        if (this.socket) {
            this.socket.disconnect();
        }
        if (videoElem.srcObject) {
            const tracks = (videoElem.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
            videoElem.srcObject = null;
        }
    }
}
declare global {
    interface Window {
        app: RemoteMouse;
    }
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
