use axum::{Json, Router, routing::get};
use serde::Serialize;

#[derive(Serialize)]
struct Message {
    message: &'static str,
}

pub fn app() -> Router {
    Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/plaintext", get(|| async { "Hello, World!" }))
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
}
