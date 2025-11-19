use redis::{Client, RedisResult};
use std::env;

pub fn create_client() -> RedisResult<Client> {
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    Client::open(redis_url)
}
