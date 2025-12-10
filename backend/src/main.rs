use dotenvy::dotenv;
use ghostbin_server::{
    app, db,
    handlers::AppState,
    repository::PasteRepository,
};
use rand::Rng;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Semaphore;

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

    let app = app(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listener — is port 8080 in use?");
    axum::serve(listener, app)
        .await
        .expect("server terminated unexpectedly");
}
