using LiquidChain.Orchestrator.Hubs;
using LiquidChain.Orchestrator.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", builder =>
    {
        builder.WithOrigins("http://localhost:5173")    // vite default
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSignalR();
builder.Services.AddSingleton<NodeManagerService>();

var app = builder.Build();

app.UseCors("AllowReactApp");

app.MapHub<BlockchainHub>("/blockchainHub");

var NETWORK_BASE = "/api/network";

// API endpoints
app.MapGet($"{NETWORK_BASE}/start", (NodeManagerService nodeManager) =>
{
    // ağı senaryodaki gibi ayağa kaldır
    nodeManager.StartNode(3001, Array.Empty<string>()); // genesis node

    // küçük bir bekleme
    Thread.Sleep(1000);

    nodeManager.StartNode(3002, new[] { "ws://localhost:3001" });   // node2

    Thread.Sleep(1000);

    nodeManager.StartNode(3003, new[] { "ws://localhost:3002" });   // node3

    return Results.Ok(new { message = "Blockchain network triggered!" });
});

app.MapGet($"{NETWORK_BASE}/stop", (NodeManagerService nodeManager) =>
{
    nodeManager.StopAllNodes();
    return Results.Ok(new { message = "Network stopped." });
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    var nodeManager = app.Services.GetRequiredService<NodeManagerService>();
    nodeManager.StopAllNodes();
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.Run();