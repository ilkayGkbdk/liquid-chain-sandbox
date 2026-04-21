import { parentPort } from "worker_threads";
import crypto from "crypto";

// ana thread'den gelen görevi dinle
parentPort.on('message', (task) => {
    const { blockIndex, previousHash, transactions, difficulty } = task;

    let nonce = 0;
    let hash = '';
    const targetPrefix = '0'.repeat(difficulty);    // örneğin 3 zorluk için prefix 000 olur
    const startTime = Date.now();

    console.log(`\n[WORKER] Started mining Block #${blockIndex} | Difficulty: ${difficulty}`);

    // proof of work döngüsü
    while (true) {
        // blok verilerini birleştir ve hashle
        const dataToHash = blockIndex + previousHash + JSON.stringify(transactions) + nonce;
        hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

        // bulundu mu?
        if (hash.startsWith(targetPrefix)) {
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[WORKER] ⛏️ Block #${blockIndex} Mined! Hash: ${hash} | Nonce: ${nonce} | Time: ${timeTaken}s`);

            // sonucu ana thread'e gönder ve bitir
            parentPort.postMessage({ success: true, blockIndex, hash, nonce, transactions });
            break;
        }

        nonce++;
    }
});