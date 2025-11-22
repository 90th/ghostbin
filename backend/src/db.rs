use deadpool_redis::{Config, Pool, Runtime};
use std::env;

pub fn create_pool() -> Result<Pool, deadpool_redis::CreatePoolError> {
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let cfg = Config::from_url(redis_url);
    cfg.create_pool(Some(Runtime::Tokio1))
}
