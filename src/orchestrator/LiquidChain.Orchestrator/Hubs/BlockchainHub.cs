using Microsoft.AspNetCore.SignalR;

namespace LiquidChain.Orchestrator.Hubs;

public class BlockchainHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"[SIGNALR] UI Client Connected: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"[SIGNALR] UI Client Disconnected: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}