import io from "socket.io-client";

type DisplayMediaOptions = {
    video: { cursor: string };
    audio: boolean;
};

class RemoteMouse {
    public displayMediaOptions: DisplayMediaOptions = null;
    private captureStream: any = null;
    private socket: SocketIOClient.Socket = null;

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
    /*
    public async startHost(): Promise<void> {
        // Sends stream, receives coordinates from mouse.
        try {
            // navigator.mediaDevices is missing getDisplayMedia: https://github.com/microsoft/TypeScript/issues/33232
            // @ts-ignore
            this.captureStream = await navigator.mediaDevices.getDisplayMedia(this.displayMediaOptions);
            const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
            videoElem.srcObject = this.captureStream;
            await videoElem.play();
            videoElem.addEventListener("mousemove", this.handleMouseMoved);
            videoElem.addEventListener("mousedown", this.handleMouseDown);
            videoElem.addEventListener("mouseup", this.handleMouseUp);
            // Fullscreen the container, if the ratio doesn't fit the video's height, the video element's height still matches the video source
            document.getElementById("video-container").requestFullscreen();
        } catch (err) {
            console.error("Error: " + err);
        }
        console.log(this.captureStream);
    }
    */

   public async startHost(): Promise<void> {
    // Sends stream, receives coordinates from mouse.
    try {
        // navigator.mediaDevices is missing getDisplayMedia: https://github.com/microsoft/TypeScript/issues/33232
        // @ts-ignore
        this.captureStream = await navigator.mediaDevices.getDisplayMedia(this.displayMediaOptions);
    } catch (err) {
        console.error("Error: " + err);
    }
    // TODO: send stream to client.
    this.socket = io("http://localhost:3000");
    this.socket.send("Hello there!!!");
    console.log("message sent")
}

    public async startClient(): Promise<void> {
        // Receives stream, sends out coordinates from mouse.
        const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
        videoElem.srcObject = this.captureStream;
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

document.addEventListener("DOMContentLoaded", async () => {
    const remoteMouse = new RemoteMouse();
    const startHostBtn = document.getElementById("start-host");
    const startClientBtn = document.getElementById("start-client");
    const stopBtn = document.getElementById("stop");
    startHostBtn.addEventListener("click", () => remoteMouse.startHost());
    startClientBtn.addEventListener("click", () => remoteMouse.startClient());
    stopBtn.addEventListener("click", () => remoteMouse.stopCapture());
    console.log("ready");
});