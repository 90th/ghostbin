pub mod db;
pub mod error;
pub mod handlers;
pub mod model;
pub mod repository;

use axum::{
    extract::DefaultBodyLimit,
    http::Method,
    routing::{get, post},
    Router,
};
use handlers::AppState;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

pub fn app(state: AppState) -> Router {
    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

    let cors = CorsLayer::new()
        .allow_origin(
            frontend_url
                .parse::<axum::http::HeaderValue>()
                .expect("Invalid FRONTEND_URL header value"),
        )
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    Router::new()
        .route("/api/v1/challenge", get(handlers::get_challenge))
        .route("/api/v1/paste", post(handlers::create_paste))
        .route(
            "/api/v1/paste/:id",
            get(handlers::get_paste).delete(handlers::delete_paste),
        )
        .route(
            "/api/v1/paste/:id/metadata",
            get(handlers::get_paste_metadata),
        )
        .layer(DefaultBodyLimit::max(1024 * 1024 + 512 * 1024)) // 1.5MB limit
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
