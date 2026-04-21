/**
 * In-Memory Transaction Pool (Mempool)
 * Geçici işlemleri tutar. Bir blok kazıldığında bu havuz temizlenmelidir.
 */
export default class Mempool {
    constructor() {
        this.transactions = new Map();
    }

    addTransaction(transaction) {
        if (!transaction || !transaction.id) {
            console.error('[MEMPOOL] Invalid transaction format. Dropped.');
            return false;
        }

        if (this.transactions.has(transaction.id)) {
            return false;
        }

        this.transactions.set(transaction.id, transaction);
        console.log(`[MEMPOOL] Added TX: ${transaction.id.substring(0, 8)}... | Total pending: ${this.transactions.size}`);
        return true;
    }

    // onaylanmak üzere tüm işlemleri array dön
    getPendingTransactions() {
        return Array.from(this.transactions.values());
    }

    // bir blok onaylandığında, o bloğun içindeki işlemleri havuzdan sil
    clearProcessedTransactions(processedTxIds) {
        let removedCount = 0;
        processedTxIds.forEach(id => {
            if (this.transactions.delete(id)) {
                removedCount++;
            }
        });

        console.log(`[MEMPOOL] Cleared ${removedCount} processed transactions. Remaining: ${this.transactions.size}`);
    }
}