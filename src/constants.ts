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
    messageClient = "messageClient"
}

export enum PeerEvents {
    signal = "signal",
    connect = "connect",
    error = "error",
    stream = "stream",
    data = "data"
}