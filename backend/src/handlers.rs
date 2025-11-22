use crate::error::AppError;
use crate::model::{CreatePasteRequest, CreatePasteResponse, Paste};
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use constant_time_eq::constant_time_eq;
use hmac::{Hmac, Mac};
use rand::Rng;
use redis::{AsyncCommands, Client};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub client: Client,
    pub hmac_secret: [u8; 32],
}

#[derive(Serialize)]
pub struct ChallengeResponse {
    pub salt: String,
    pub difficulty: usize,
    pub timestamp: u64,
    pub signature: String,
}

const POW_DIFFICULTY: usize = 4;

pub async fn get_challenge(State(state): State<AppState>) -> Json<ChallengeResponse> {
    let mut rng = rand::thread_rng();
    let mut salt_bytes = [0u8; 16];
    rng.fill(&mut salt_bytes);
    let salt = hex::encode(salt_bytes);

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let difficulty = POW_DIFFICULTY; // Leading zeros required (hex characters)

    // Create signature: HMAC-SHA256(salt + difficulty + timestamp)
    type HmacSha256 = Hmac<Sha256>;
    let mut mac =
        HmacSha256::new_from_slice(&state.hmac_secret).expect("HMAC can take key of any size");
    mac.update(salt.as_bytes());
    mac.update(difficulty.to_string().as_bytes());
    mac.update(timestamp.to_string().as_bytes());
    let result = mac.finalize();
    let signature = hex::encode(result.into_bytes());

    Json(ChallengeResponse {
        salt,
        difficulty,
        timestamp,
        signature,
    })
}

pub async fn create_paste(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<CreatePasteRequest>,
) -> Result<(StatusCode, Json<CreatePasteResponse>), AppError> {
    // 1. Verify PoW
    let pow_salt = headers
        .get("X-PoW-Salt")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("Missing X-PoW-Salt header".to_string()))?;

    let pow_nonce = headers
        .get("X-PoW-Nonce")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("Missing X-PoW-Nonce header".to_string()))?;

    let pow_ts_str = headers
        .get("X-PoW-Timestamp")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("Missing X-PoW-Timestamp header".to_string()))?;

    let pow_sig = headers
        .get("X-PoW-Signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("Missing X-PoW-Signature header".to_string()))?;

    let mut con = state.client.get_multiplexed_async_connection().await?;
    let salt_key = format!("pow:salt:{}", pow_salt);

    // Atomic check and set to prevent race conditions (TOCTOU)
    let set_result: Option<String> = redis::cmd("SET")
        .arg(&salt_key)
        .arg("used")
        .arg("NX")
        .arg("EX")
        .arg(120)
        .query_async(&mut con)
        .await?;

    if set_result.is_none() {
        return Err(AppError::Unauthorized("PoW salt already used".to_string()));
    }

    let pow_ts: u64 = pow_ts_str
        .parse()
        .map_err(|_| AppError::BadRequest("Invalid X-PoW-Timestamp".to_string()))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Check expiration (2 minutes)
    if now.saturating_sub(pow_ts) > 120 {
        return Err(AppError::Unauthorized("PoW challenge expired".to_string()));
    }

    // Verify Signature
    let difficulty = POW_DIFFICULTY;
    type HmacSha256 = Hmac<Sha256>;
    let mut mac =
        HmacSha256::new_from_slice(&state.hmac_secret).expect("HMAC can take key of any size");
    mac.update(pow_salt.as_bytes());
    mac.update(difficulty.to_string().as_bytes());
    mac.update(pow_ts.to_string().as_bytes());

    let expected_sig = hex::encode(mac.finalize().into_bytes());
    if !constant_time_eq(expected_sig.as_bytes(), pow_sig.as_bytes()) {
        return Err(AppError::Unauthorized("Invalid PoW signature".to_string()));
    }

    // Verify Work
    let mut hasher = Sha256::new();
    hasher.update(pow_salt.as_bytes());
    hasher.update(pow_nonce.as_bytes());
    let hash = hex::encode(hasher.finalize());

    if !hash.starts_with(&"0".repeat(difficulty)) {
        return Err(AppError::Unauthorized("PoW difficulty not met".to_string()));
    }

    let id = Uuid::new_v4().to_string();

    let paste = Paste {
        id: id.clone(),
        iv: req.iv,
        data: req.data,
        created_at: req.created_at,
        expires_at: req.expires_at,
        burn_after_read: req.burn_after_read,
        views: req.views,
        language: req.language,
        has_password: req.has_password,
        salt: req.salt,
        encrypted_key: req.encrypted_key,
        key_iv: req.key_iv,
        burn_token_hash: req.burn_token_hash,
    };

    let key = format!("paste:{}", paste.id);
    let json = serde_json::to_string(&paste)?;

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
                return Err(AppError::BadRequest("Paste already expired".to_string()));
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
        .await?;

    if result.is_none() {
        // Key already exists (collision or malicious overwrite attempt)
        return Err(AppError::Conflict("Paste ID already exists".to_string()));
    }

    Ok((StatusCode::CREATED, Json(CreatePasteResponse { id })))
}

pub async fn get_paste(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Paste>, AppError> {
    let mut con = state.client.get_multiplexed_async_connection().await?;

    let key = format!("paste:{}", id);

    // Get paste
    let json: Option<String> = con.get(&key).await?;
    let json = json.ok_or(AppError::PasteNotFound)?;

    let mut paste: Paste = serde_json::from_str(&json)?;

    if paste.burn_after_read && !paste.has_password {
        // set panic ttl (90s) burn burn burn away
        let _: () = con.expire(&key, 90).await?;
    } else {
        // Increment views
        paste.views += 1;

        let new_json = serde_json::to_string(&paste)?;

        // Update in Redis using KEEPTTL to preserve expiration atomically
        let _: () = redis::cmd("SET")
            .arg(&key)
            .arg(new_json)
            .arg("KEEPTTL")
            .query_async(&mut con)
            .await?;
    }

    Ok(Json(paste))
}

pub async fn delete_paste(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<StatusCode, AppError> {
    let mut con = state.client.get_multiplexed_async_connection().await?;

    let key = format!("paste:{}", id);

    // fetch metadata to check for burn token
    let json: Option<String> = con.get(&key).await?;
    let json = json.ok_or(AppError::PasteNotFound)?;
    let paste: Paste = serde_json::from_str(&json)?;

    if paste.burn_after_read {
        if let Some(stored_hash) = paste.burn_token_hash {
            let token = headers
                .get("X-Burn-Token")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");

            let mut hasher = Sha256::new();
            hasher.update(token.as_bytes());
            let provided_hash = hex::encode(hasher.finalize());

            if !constant_time_eq(provided_hash.as_bytes(), stored_hash.as_bytes()) {
                return Err(AppError::Unauthorized("Invalid burn token".to_string()));
            }
        }
    }

    let _: () = con.del(&key).await?;

    Ok(StatusCode::NO_CONTENT)
}
