use crate::model::Paste;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use redis::{AsyncCommands, Client};
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn create_paste(
    State(client): State<Client>,
    Json(paste): Json<Paste>,
) -> Result<StatusCode, (StatusCode, String)> {
    if paste.id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "ID cannot be empty".to_string()));
    }

    let mut con = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let key = format!("paste:{}", paste.id);
    let json = serde_json::to_string(&paste)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Calculate TTL
    let ttl_seconds = if let Some(expires_at) = paste.expires_at {
        if expires_at > 0 {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as i64;

            let diff = expires_at - now;
            if diff > 0 {
                Some((diff / 1000) as u64)
            } else {
                // Already expired
                return Err((StatusCode::BAD_REQUEST, "Paste already expired".to_string()));
            }
        } else {
            None
        }
    } else {
        None
    };

    // Default 30 days if no TTL or 0 (Never)
    let final_ttl = ttl_seconds.unwrap_or(30 * 24 * 60 * 60);

    // Use SETNX (set_nx) logic to prevent overwriting existing keys
    // Redis crate doesn't have a direct set_nx_ex, so we check existence first or use a script/transaction.
    // For simplicity and performance in this context, we'll check existence first.
    // A race condition is theoretically possible but highly unlikely with UUIDs.
    // Ideally, we would use a Lua script or SET with NX argument if supported by the high-level API.
    
    // Using the low-level command to support SET key value NX EX ttl
    let result: Option<String> = redis::cmd("SET")
        .arg(&key)
        .arg(json)
        .arg("NX")
        .arg("EX")
        .arg(final_ttl)
        .query_async(&mut con)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.is_none() {
        // Key already exists (collision or malicious overwrite attempt)
        return Err((StatusCode::CONFLICT, "Paste ID already exists".to_string()));
    }

    Ok(StatusCode::CREATED)
}

pub async fn get_paste(
    State(client): State<Client>,
    Path(id): Path<String>,
) -> Result<Json<Paste>, StatusCode> {
    let mut con = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let key = format!("paste:{}", id);

    // Get paste
    let json: String = con.get(&key).await.map_err(|_| StatusCode::NOT_FOUND)?;

    let mut paste: Paste =
        serde_json::from_str(&json).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if paste.burn_after_read && !paste.has_password {
        // Delete immediately ONLY if it's not password protected
        let _: () = con
            .del(&key)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    } else {
        // Increment views
        paste.views += 1;

        // Update in Redis, preserving TTL
        let ttl: i64 = con.ttl(&key).await.unwrap_or(-1);

        let new_json = serde_json::to_string(&paste).unwrap();

        if ttl > 0 {
            let _: () = con
                .set_ex(&key, new_json, ttl as u64)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        } else {
            let _: () = con
                .set(&key, new_json)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }
    }

    Ok(Json(paste))
}

pub async fn delete_paste(
    State(client): State<Client>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    let mut con = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let key = format!("paste:{}", id);

    let _: () = con
        .del(&key)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
