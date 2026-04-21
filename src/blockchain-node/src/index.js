import P2PNetwork from "./P2PNetwork.js";
import Mempool from './Mempool.js';
import { v4 as uuidv4 } from 'uuid';

// read configurations from environment variables or CLI arguments
// pattern: HTTP_PORT=3001 PEERS=ws://localhost:3002,ws://localhost:3003 npm start
const P2P_PORT = process.env.P2P_PORT || 3001;
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : [];

// services
const mempool = new Mempool();
const p2pServer = new P2PNetwork(P2P_PORT);

// 1. start listening
p2pServer.listen();

// 2. connect existing peers (if any)
if (PEERS.length > 0) {
    console.log(`[INIT] Attempting to connect to peers: ${PEERS.join(', ')}`);
    p2pServer.connectToPeers(PEERS);
}

p2pServer.on('message_received', (message) => {
    if (message.type === 'TRANSACTION') {
        // Gelen işlemi havuza ekle
        mempool.addTransaction(message.payload);
    }
});

// 3. testing only -> mocking a user creating a transaction
// we simulate a transaction being broadcasted every 10 seconds to test the Gossip Protocol
setInterval(() => {
    // only node 3001 will generate mock transactions to see if others receive it
    if (P2P_PORT == 3001) {
        const mockTx = {
            id: uuidv4(),
            type: "TRANSACTION",
            payload: {
                id: uuidv4,
                from: "İlkay",
                to: "Ahmet",
                amount: Math.floor(Math.random() * 100),
                timestamp: Date.now()
            }
        };

        console.log(`\n[LOCAL] Generating new transaction: ${mockTx.payload.amount} BTC`);
        mempool.addTransaction(mockTx.payload);
        p2pServer.broadcast(mockTx);
    }
}, 5000);