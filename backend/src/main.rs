mod db;
mod error;
mod handlers;
mod model;
mod repository;

use axum::{
    extract::DefaultBodyLimit,
    http::Method,
    routing::{get, post},
    Router,
};
use dotenvy::dotenv;
use handlers::AppState;
use rand::Rng;
use repository::PasteRepository;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

const MAX_CONCURRENT_READS: usize = 50;
const MAX_CONCURRENT_CHALLENGES: usize = 100;

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    let pool = db::create_pool().expect("Failed to create Redis pool");
    let repository = PasteRepository::new(pool);

    let mut rng = rand::thread_rng();
    let hmac_secret: [u8; 32] = rng.gen();

    let read_limiter = Arc::new(Semaphore::new(MAX_CONCURRENT_READS));
    let challenge_limiter = Arc::new(Semaphore::new(MAX_CONCURRENT_CHALLENGES));

    let state = AppState {
        repository,
        hmac_secret,
        read_limiter,
        challenge_limiter,
    };

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

    let app = Router::new()
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
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listener — is port 8080 in use?");
    axum::serve(listener, app)
        .await
        .expect("server terminated unexpectedly");
}
