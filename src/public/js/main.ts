document.addEventListener("DOMContentLoaded", async () => {
    const remoteMouse = new RemoteMouse();
    const startBtn = document.getElementById("start-client");
    const stopBtn = document.getElementById("stop");
    startBtn.addEventListener("click", () => remoteMouse.startCapture());
    stopBtn.addEventListener("click", () => remoteMouse.stopCapture());
    console.log("ready");
});

type DisplayMediaOptions = {
    video: { cursor: string };
    audio: boolean;
};

class RemoteMouse {
    public displayMediaOptions: DisplayMediaOptions = null;
    private captureStream: any = null;

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

    public async startCapture(): Promise<void> {
        try {
            // navigator.mediaDevices is missing getDisplayMedia: https://github.com/microsoft/TypeScript/issues/33232
            // @ts-ignore
            this.captureStream = await navigator.mediaDevices.getDisplayMedia(this.displayMediaOptions);
            const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
            videoElem.srcObject = this.captureStream;
            await videoElem.requestFullscreen();
            await videoElem.play();
            videoElem.addEventListener("mousemove", this.handleMouseMoved);
            videoElem.addEventListener("mousedown", this.handleMouseDown);
            videoElem.addEventListener("mouseup", this.handleMouseUp);
        } catch (err) {
            console.error("Error: " + err);
        }
        console.log(this.captureStream);
    }

    public stopCapture(): void {
        const videoElem: HTMLVideoElement = document.getElementById("video") as HTMLVideoElement;
        let tracks = (videoElem.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        videoElem.srcObject = null;
        videoElem.removeEventListener("mousemove", this.handleMouseMoved);
        videoElem.removeEventListener("mousedown", this.handleMouseDown);
        videoElem.removeEventListener("mouseup", this.handleMouseUp);
    }
}
