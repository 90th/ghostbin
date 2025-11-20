mod db;
mod handlers;
mod model;

use axum::{
    extract::DefaultBodyLimit,
    http::Method,
    routing::{get, post},
    Router,
};
use dotenvy::dotenv;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    let client = db::create_client().expect("Failed to create Redis client");

    let cors = CorsLayer::new()
        .allow_origin(
            "http://localhost:3000"
                .parse::<axum::http::HeaderValue>()
                .unwrap(),
        )
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/v1/paste", post(handlers::create_paste))
        .route(
            "/api/v1/paste/:id",
            get(handlers::get_paste).delete(handlers::delete_paste),
        )
        .layer(DefaultBodyLimit::max(1024 * 1024 + 512 * 1024)) // 1.5MB limit
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(client);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
