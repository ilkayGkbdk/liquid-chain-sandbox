import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

// es modules ortamında __dirname simülasyonu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class Miner {
    constructor() {
        this.worker = null;
        this.isMining = false;
    }

    startMining(blockIndex, previousHash, transactions, difficulty, onBlockFound) {
        if (this.isMining) {
            console.log('[MINER] Already mining, ignoring start request...');
            return;
        }

        if (transactions.length === 0) {
            console.log('[MINER] Mempool is empty. Nothing to mine.');
            return;
        }

        this.isMining = true;

        // yeni bir worker thread oluştur
        this.worker = new Worker(path.join(__dirname, 'worker.js'));

        // worker bloğu bulduğunda çalışacak event
        this.worker.on('message', (result) => {
            this.isMining = false;
            onBlockFound(result);
            this.worker.terminate();    // iş bitti, thread'i öldür
        });

        this.worker.on('error', (err) => {
            console.error('[MINER] Worker Error:', err);
            this.isMining = false;
        });

        // worker'a madencilik verilerini gönder
        this.worker.postMessage({ blockIndex, previousHash, transactions, difficulty });
    }

    stopMining() {
        if (this.worker && this.isMining) {
            this.worker.terminate();    // mevcut thread'i anında öldür
            this.isMining = false;
            console.log('[MINER] 🛑 Mining stopped (Another node probably found the block).');
        }
    }
}