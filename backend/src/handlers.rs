use crate::model::Paste;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use redis::{AsyncCommands, Client};
use sha2::{Digest, Sha256};
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
    let mut final_ttl = ttl_seconds.unwrap_or(30 * 24 * 60 * 60);

    const MAX_TTL: u64 = 30 * 24 * 60 * 60;
    if final_ttl > MAX_TTL {
        final_ttl = MAX_TTL;
    }

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
        // set panic ttl (10 mins) to ensure deletion if client crashes
        let _: () = con
            .expire(&key, 600)
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
    headers: HeaderMap,
) -> Result<StatusCode, StatusCode> {
    let mut con = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let key = format!("paste:{}", id);

    // fetch metadata to check for burn token
    let json: String = con.get(&key).await.map_err(|_| StatusCode::NOT_FOUND)?;
    let paste: Paste =
        serde_json::from_str(&json).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if paste.burn_after_read {
        if let Some(stored_hash) = paste.burn_token_hash {
            let token = headers
                .get("X-Burn-Token")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");

            let mut hasher = Sha256::new();
            hasher.update(token.as_bytes());
            let provided_hash = hex::encode(hasher.finalize());

            if provided_hash != stored_hash {
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

    let _: () = con
        .del(&key)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
