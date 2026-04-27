import { create } from "zustand";
import * as signalR from "@microsoft/signalr";

// merkezi veri deposu
const useStore = create((set, get) => ({
    nodes: [],  // ağdaki aktif node listesi
    mempool: [],    // bekleyen işlemler
    blocks: [], // kazılmış bloklar
    logs: [],
    isConnected: false, // backend signalR

    // actions
    addLog: (log) => set((state) => {
        // son 100 log
        const newLogs = [...state.logs, log];
        if (newLogs.length > 100) newLogs.shift();
        return { logs: newLogs };
    }),

    addNode: (port) => set((state) => {
        if (!state.nodes.includes(port)) {
            return { nodes: [...state.nodes, port] };
        }
        return state;
    }),

    // sistem durduğunda her şeiy temizle
    clearSystem: () => set({ nodes: [], mempool: [], logs: [] }),

    // signalR
    connectToOrchestrator: async () => {
        if (get().isConnected) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5000/blockchainHub")
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveLog", (data) => {
            const { port, message, timestamp } = data;

            get().addLog({ port, message, time: new Date(timestamp).toLocaleTimeString() });

            // yeni node ayağa kalkarsa haritaya ekle
            if (message.includes("Listening for peer connections")) {
                get().addNode(port);
            };

        });

        try {
            await connection.start();
            set({ isConnected: true });
            get().addLog({ port: "SYSTEM", message: "SignalR Bağlantısı Kuruldu!", time: new Date(timestamp).toLocaleTimeString() });
        } catch (error) {
            console.error("SignalR connection error: ", error);
            get().addLog({ port: "ERROR", message: "Orkestratör'e Bağlanılamadı. .NET API çalışıyor mu?", time: new Date(timestamp).toLocaleTimeString() });
        }
    }
}));