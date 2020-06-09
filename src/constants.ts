export enum SocketEvents {
    connect = "connect",
    disconnect = "disconnect",
    error = "error",
    message = "message",
    setPeerData = "setPeerData",
    setPeerTrickleICE = "setPeerTrickleICE",
    peerUpdatedICECandidate = "peerUpdatedICECandidate",
    getPeerData = "getPeerData"
}

export enum PeerEvents {
    signal = "signal",
    connect = "connect",
    error = "error",
    stream = "stream",
    data = "data"
}