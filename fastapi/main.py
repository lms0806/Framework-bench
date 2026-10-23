from typing import TypedDict

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

app = FastAPI()


class Message(TypedDict):
    message: str


class Item(TypedDict):
    id: int
    name: str
    value: int


class AggregateResult(TypedDict):
    count: int
    sum: int
    min: int
    max: int


@app.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "OK"


@app.get("/plaintext", response_class=PlainTextResponse)
async def plaintext() -> str:
    return "Hello, World!"


@app.get("/json")
async def json_response() -> Message:
    return {"message": "Hello, World!"}


class AggregateInput(BaseModel):
    numbers: list[int]


@app.get("/json-large")
async def json_large() -> list[Item]:
    return [{"id": i, "name": f"item-{i}", "value": i * 10} for i in range(1, 1001)]


@app.post("/aggregate")
async def aggregate(data: AggregateInput) -> AggregateResult:
    return {"count": len(data.numbers), "sum": sum(data.numbers),
            "min": min(data.numbers, default=0), "max": max(data.numbers, default=0)}
