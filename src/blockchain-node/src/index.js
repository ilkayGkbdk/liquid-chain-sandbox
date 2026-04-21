import P2PNetwork from "./P2PNetwork.js";
import Mempool from './Mempool.js';
import Miner from "./Miner.js"
import { v4 as uuidv4 } from 'uuid';

// read configurations from environment variables or CLI arguments
// pattern: HTTP_PORT=3001 PEERS=ws://localhost:3002,ws://localhost:3003 npm start
const P2P_PORT = process.env.P2P_PORT || 3001;
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : [];

// services
const mempool = new Mempool();
const p2pServer = new P2PNetwork(P2P_PORT);
const miner = new Miner();

// mvp için basit bir zincir simülasyonu
let currentBlockIndex = 1;
let lastBlockHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis Hash
const DIFFICULTY = 4; // 4 sıfır bulmak ortalama birkaç saniye sürer

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
        const added = mempool.addTransaction(message.payload);

        // Havuzda 3 veya daha fazla işlem varsa ve madencilik yapmıyorsak başla!
        if (added && mempool.getPendingTransactions().length >= 3 && !miner.isMining) {
            startMiningProcess();
        }
    }

    // ağdaki başka birisi bizden önce bloğu bulursa?
    if (message.type === 'BLOCK_FOUND') {
        console.log(`\n[NETWORK] Node broadcasted Block #${message.payload.blockIndex}! Verifying...`);
        // mevcut kazıyı durdur
        miner.stopMining();

        // havuzu temizle ve zinciri güncelle
        const processedTxIds = message.payload.transactions.map(tx => tx.id);
        mempool.clearProcessedTransactions(processedTxIds);
        currentBlockIndex = message.payload.blockIndex + 1;
        lastBlockHash = message.payload.hash;
    }
});

function startMiningProcess() {
    const transactionsToMine = mempool.getPendingTransactions().slice(0, 3) // ilk 3 işlemi al

    miner.startMining(
        currentBlockIndex,
        lastBlockHash,
        transactionsToMine,
        DIFFICULTY,
        (minedBlock) => {
            // worker bloğu buldu
            // 1. ağdaki herkese yeni bloğu duyur
            p2pServer.broadcast({
                type: 'BLOCK_FOUND',
                payload: minedBlock
            });

            // 2. kendi havuzumuzu temizle ve state'i güncelle
            const processedTxIds = minedBlock.transactions.map(tx => tx.id);
            mempool.clearProcessedTransactions(processedTxIds);

            currentBlockIndex++;
            lastBlockHash = minedBlock.hash;
            console.log(`[CORE] Chain updated. Next block will be #${currentBlockIndex}`);
        }
    );
}

// sadece 3001 numaralı port işlem üretsin
setInterval(() => {
    // only node 3001 will generate mock transactions to see if others receive it
    if (P2P_PORT == 3001) {
        const mockTx = {
            id: uuidv4(),
            type: "TRANSACTION",
            payload: {
                id: uuidv4(),
                from: "İlkay",
                to: "Ahmet",
                amount: Math.floor(Math.random() * 100),
                timestamp: Date.now()
            }
        };

        console.log(`\n[LOCAL] Generating new transaction: ${mockTx.payload.amount} BTC`);
        const added = mempool.addTransaction(mockTx.payload);
        p2pServer.broadcast(mockTx);

        // kendi kendimize kontrol
        if (added && mempool.getPendingTransactions().length >= 3 && !miner.isMining) {
            startMiningProcess();
        }
    }
}, 3000);