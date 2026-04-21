import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

/**
 * peer-to-Peer Mesh Network Implementation
 * uses Gossip Protocol to broadcast messages across the network.
 */
export default class P2PNetwork {
    constructor(port) {
        this.port = port;
        this.sockets = [];  // connected peers
        this.seenMessages = new Set();  // prevents infinite echo loops
    }

    // starts the websocket server to accept incoming connections
    listen() {
        const server = new WebSocketServer({ port: this.port });

        server.on('connection', (socket, req) => {
            const clientIp = req.socket.remoteAddress;
            console.log(`[P2P] New incoming connection from ${clientIp}`);
            this.#initConnection(socket);
        });

        console.log(`[P2P] Listening for peer connections on port ${this.port}...`);
    }

    // connects to known peers (Seed nodes or Orchestrator provided IPs)
    connectToPeers(peers) {
        peers.forEach(peer => {
            try {
                const socket = new WebSocket(peer);

                socket.on("open", () => {
                    console.log(`[P2P] Successfully connected to peer: ${peer}`);
                    this.#initConnection(socket);
                });
                socket.on('error', () => {
                    console.log(`[P2P] Failed to connect to peer: ${peer}. It might be down.`);
                });
            } 
            catch (error) {
                console.error(`[P2P] Invalid peer address: ${peer}`);
            }
        });
    }

    // internal method to setup event listeners for a new socket
    #initConnection(socket) {
        this.sockets.push(socket);

        socket.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                this.#handleMessage(parsedMessage, socket);
            } catch (error) {
                console.error('[P2P] Failed to parse incoming message.', error.message);
            }
        });

        socket.on('close', () => {
            console.log('[P2P] A peer disconnected.');
            this.sockets = this.sockets.filter(s => s !== socket);
        });
    }

    // evaluates incoming messages and decides whether to broadcast (Gossip)
    #handleMessage(message, senderSocket) {
        // infinite loop protection
        if (this.seenMessages.has(message.id)) return;  // already processed

        // add to seen list
        this.seenMessages.add(message.id);

        // keep memory clean: In a real prod env, we'd use a TTL cache or LRU cache here.
        if (this.seenMessages.size > 10000) {
            this.seenMessages.clear();  // native cleanup for mvp
        }

        console.log(`[P2P] Received [${message.type}]:`, message.payload);

        // relay the message to others
        // broadcast to everyone except the one who sent it to us
        this.broadcast(message, senderSocket);

        // TODO: pass payload to Mempool or Blockchain Ledger (to be implemented)
    }

    // send message to the network
    broadcast(message, excludeSocket = null) {
        // if it's a completely new message originating from THIS node, assign an ID
        if (!message.id) {
            message.id = uuidv4();
            this.seenMessages.add(message.id);
        }

        const messageString = JSON.stringify(message);

        this.sockets.forEach(socket => {
            // don't echo the message back to the sender
            if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
                socket.send(messageString);
            }
        });
    }
}