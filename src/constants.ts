export enum SocketEvents {
    connection = "connection", // Server only
    connect = "connect",
    disconnect = "disconnect",
    error = "error",
    message = "message",
    becomeHost = "becomeHost",
    becomeClient = "becomeClient",
    clientHostExists = "clientHostExists",
    messageHost = "messageHost",
    messageClient = "messageClient",
    serverData = "serverData"
}

export enum PeerEvents {
    signal = "signal",
    connect = "connect",
    error = "error",
    stream = "stream",
    data = "data"
}

export enum InputTypes {
    mouseDown = "mouseDown",
    mouseUp = "mouseUp",
    mouseMove = "mouseMove"
}

export type InputData = {
    type: InputTypes,
    x: number,
    y: number,
    lMouseDown: boolean
    data?: any
}