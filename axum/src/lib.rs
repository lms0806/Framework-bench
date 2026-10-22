use axum::{
    Json, Router,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct Message {
    message: &'static str,
}

#[derive(Serialize)]
struct Item {
    id: u32,
    name: String,
    value: u32,
}

#[derive(Deserialize)]
struct AggregateInput {
    numbers: Vec<u32>,
}

#[derive(Serialize)]
struct AggregateResult {
    count: usize,
    sum: u64,
    min: u32,
    max: u32,
}

async fn json_large() -> Json<Vec<Item>> {
    Json(
        (1..=100)
            .map(|id| Item {
                id,
                name: format!("item-{id}"),
                value: id * 10,
            })
            .collect(),
    )
}

async fn aggregate(Json(input): Json<AggregateInput>) -> Json<AggregateResult> {
    let count = input.numbers.len();
    let sum = input.numbers.iter().map(|&n| u64::from(n)).sum();
    let min = input.numbers.iter().copied().min().unwrap_or(0);
    let max = input.numbers.iter().copied().max().unwrap_or(0);
    Json(AggregateResult {
        count,
        sum,
        min,
        max,
    })
}

pub fn app() -> Router {
    Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/plaintext", get(|| async { "Hello, World!" }))
        .route("/json-large", get(json_large))
        .route("/aggregate", post(aggregate))
        .route(
            "/json",
            get(|| async {
                Json(Message {
                    message: "Hello, World!",
                })
            }),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{Body, to_bytes},
        http::{Request, StatusCode, header},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn endpoints_return_expected_responses() {
        for (path, content_type, body) in [
            ("/health", "text/plain; charset=utf-8", "OK"),
            ("/plaintext", "text/plain; charset=utf-8", "Hello, World!"),
            (
                "/json",
                "application/json",
                "{\"message\":\"Hello, World!\"}",
            ),
        ] {
            let response = app()
                .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
            assert_eq!(response.headers()[header::CONTENT_TYPE], content_type);
            assert_eq!(
                to_bytes(response.into_body(), 1024).await.unwrap().as_ref(),
                body.as_bytes()
            );
        }
    }

    #[tokio::test]
    async fn workload_endpoints_return_expected_data() {
        let response = app()
            .oneshot(
                Request::builder()
                    .uri("/json-large")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let data: serde_json::Value =
            serde_json::from_slice(&to_bytes(response.into_body(), 65536).await.unwrap()).unwrap();
        let expected: Vec<_> = (1..=100)
            .map(|id| serde_json::json!({"id": id, "name": format!("item-{id}"), "value": id * 10}))
            .collect();
        assert_eq!(data, serde_json::json!(expected));
        let body = serde_json::json!({"numbers": (1..=1000).collect::<Vec<_>>()}).to_string();
        let response = app()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/aggregate")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let data: serde_json::Value =
            serde_json::from_slice(&to_bytes(response.into_body(), 1024).await.unwrap()).unwrap();
        assert_eq!(
            data,
            serde_json::json!({"count":1000,"sum":500500,"min":1,"max":1000})
        );
    }
}
