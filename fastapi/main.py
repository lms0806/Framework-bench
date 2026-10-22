from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

app = FastAPI()


@app.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "OK"


@app.get("/plaintext", response_class=PlainTextResponse)
async def plaintext() -> str:
    return "Hello, World!"


@app.get("/json")
async def json_response() -> dict[str, str]:
    return {"message": "Hello, World!"}


class AggregateInput(BaseModel):
    numbers: list[int]


@app.get("/json-large")
async def json_large() -> list[dict[str, int | str]]:
    return [{"id": i, "name": f"item-{i}", "value": i * 10} for i in range(1, 101)]


@app.post("/aggregate")
async def aggregate(data: AggregateInput) -> dict[str, int]:
    return {"count": len(data.numbers), "sum": sum(data.numbers),
            "min": min(data.numbers, default=0), "max": max(data.numbers, default=0)}
