using System.Text.Json.Serialization;

var builder = WebApplication.CreateSlimBuilder(args);
builder.Logging.ClearProviders();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, BenchmarkJsonContext.Default));

var address = Environment.GetEnvironmentVariable("BIND_ADDR") ?? "0.0.0.0:3000";
builder.WebHost.UseUrls($"http://{address}");
var app = builder.Build();

app.MapGet("/health", () => Results.Text("OK", "text/plain"));
app.MapGet("/plaintext", () => Results.Text("Hello, World!", "text/plain"));
app.MapGet("/json", () => new MessageResponse("Hello, World!"));
app.MapGet("/json-large", () => Enumerable.Range(1, 1000)
    .Select(id => new Item(id, $"item-{id}", id * 10)).ToArray());
app.MapPost("/aggregate", (AggregateInput input) =>
{
    if (input.Numbers is null) return Results.BadRequest();
    long sum = 0, min = 0, max = 0;
    if (input.Numbers.Length > 0) min = max = input.Numbers[0];
    foreach (var number in input.Numbers)
    {
        sum += number;
        min = Math.Min(min, number);
        max = Math.Max(max, number);
    }
    return Results.Ok(new AggregateResult(input.Numbers.Length, sum, min, max));
});

app.Run();

record MessageResponse(string Message);
record Item(int Id, string Name, int Value);
record AggregateInput(long[]? Numbers);
record AggregateResult(int Count, long Sum, long Min, long Max);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(MessageResponse))]
[JsonSerializable(typeof(Item[]))]
[JsonSerializable(typeof(AggregateInput))]
[JsonSerializable(typeof(AggregateResult))]
partial class BenchmarkJsonContext : JsonSerializerContext;
