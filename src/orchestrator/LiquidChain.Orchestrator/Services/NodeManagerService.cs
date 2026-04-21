using System;
using System.Diagnostics;
using LiquidChain.Orchestrator.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace LiquidChain.Orchestrator.Services;

public class NodeManagerService
{
    private readonly IHubContext<BlockchainHub> _hubContext;
    private readonly Dictionary<int, Process> _runningNodes = new();
    private readonly string _nodeScriptPath;

    public NodeManagerService(IHubContext<BlockchainHub> hubContext)
    {
        _hubContext = hubContext;

        // proje yapısına göre nodejs projesini bul
        var currentDir = Directory.GetCurrentDirectory();
        _nodeScriptPath = Path.GetFullPath(Path.Combine(currentDir, "../../blockchain-node/src/index.js"));
    }

    public void StartNode(int port, string[] peers)
    {
        if (_runningNodes.ContainsKey(port))
        {
            Console.WriteLine($"[ORCHESTRATOR] Node on port {port} is already running.");
            return;
        }

        var peersString = peers.Length > 0 ? string.Join(",", peers) : "";

        var processStartInfo = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = $"\"{_nodeScriptPath}\"",   // node script yolu
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        // nodejs'in okuyacağı env
        processStartInfo.EnvironmentVariables["P2P_PORT"] = port.ToString();
        if (!string.IsNullOrEmpty(peersString))
        {
            processStartInfo.EnvironmentVariables["PEERS"] = peersString;
        }

        var process = new Process { StartInfo = processStartInfo };

        // nodejs terminaline düşenler buraya gelir
        process.OutputDataReceived += async (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                // konsole bas
                Console.WriteLine($"[NODE-{port}] {e.Data}");

                // frontend'e gönder
                await _hubContext.Clients.All.SendAsync("ReceiveLog", new { Port = port, Message = e.Data, Timestamp = DateTime.UtcNow });
            }
        };

        process.ErrorDataReceived += async (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[NODE-{port} ERROR] {e.Data}");
                Console.ResetColor();
            }
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        _runningNodes.Add(port, process);
        Console.WriteLine($"[ORCHESTRATOR] Successfully started Node on port {port}.");
    }

    public void StopAllNodes()
    {
        foreach (var process in _runningNodes.Values)
        {
            if (!process.HasExited)
            {
                process.Kill();
            }
        }

        _runningNodes.Clear();
        Console.WriteLine("[ORCHESTRATOR] All nodes stopped.");
    }
}
