use crate::error::AppError;
use crate::model::{CreatePasteRequest, CreatePasteResponse, Paste};
use crate::repository::PasteRepository;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use constant_time_eq::constant_time_eq;
use hmac::{Hmac, Mac};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Semaphore;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub repository: PasteRepository,
    pub hmac_secret: [u8; 32],
    pub read_limiter: Arc<Semaphore>,
    pub challenge_limiter: Arc<Semaphore>,
}

#[derive(Serialize, Deserialize)]
pub struct ChallengeResponse {
    pub salt: String,
    pub difficulty: usize,
    pub timestamp: u64,
    pub signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PasteMetadata {
    pub exists: bool,
    pub has_password: bool,
    pub burn_after_read: bool,
    pub created_at: i64,
    pub expires_at: Option<i64>,
}

const POW_DIFFICULTY: usize = 4;

pub async fn get_challenge(
    State(state): State<AppState>,
) -> Result<Json<ChallengeResponse>, AppError> {
    let _permit = state
        .challenge_limiter
        .try_acquire()
        .map_err(|_| AppError::TooManyRequests)?;

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

    Ok(Json(ChallengeResponse {
        salt,
        difficulty,
        timestamp,
        signature,
    }))
}

pub async fn get_paste_metadata(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<PasteMetadata>, AppError> {
    let paste = state.repository.get_paste(&id).await?;

    match paste {
        Some(paste) => Ok(Json(PasteMetadata {
            exists: true,
            has_password: paste.has_password,
            burn_after_read: paste.burn_after_read,
            created_at: paste.created_at,
            expires_at: paste.expires_at,
        })),
        None => Ok(Json(PasteMetadata {
            exists: false,
            has_password: false,
            burn_after_read: false,
            created_at: 0,
            expires_at: None,
        })),
    }
}

async fn verify_proof_of_work(state: &AppState, headers: &HeaderMap) -> Result<(), AppError> {
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

    if !state.repository.mark_salt_used(pow_salt).await? {
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

    Ok(())
}

pub async fn create_paste(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<CreatePasteRequest>,
) -> Result<(StatusCode, Json<CreatePasteResponse>), AppError> {
    verify_proof_of_work(&state, &headers).await?;

    req.validate().map_err(AppError::BadRequest)?;

    let id = Uuid::new_v4().to_string();

    let paste = Paste {
        id: id.clone(),
        iv: req.iv,
        data: req.data,
        created_at: req.created_at,
        expires_at: req.expires_at,
        burn_after_read: req.burn_after_read,
        views: req.views,
        has_password: req.has_password,
        salt: req.salt,
        encrypted_key: req.encrypted_key,
        key_iv: req.key_iv,
        burn_token_hash: req.burn_token_hash,
    };

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

    state.repository.save_paste(paste, final_ttl).await?;

    Ok((StatusCode::CREATED, Json(CreatePasteResponse { id })))
}

pub async fn get_paste(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Paste>, AppError> {
    let _permit = state
        .read_limiter
        .try_acquire()
        .map_err(|_| AppError::TooManyRequests)?;

    let paste = state.repository.get_paste(&id).await?;
    let paste = paste.ok_or(AppError::PasteNotFound)?;

    if paste.burn_after_read && !paste.has_password {
        // set panic ttl (90s) burn burn burn away
        state.repository.set_burn_timeout(&id, 90).await?;
        Ok(Json(paste))
    } else {
        // Increment views
        let updated_paste = state.repository.increment_views(paste).await?;
        Ok(Json(updated_paste))
    }
}

pub async fn delete_paste(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<StatusCode, AppError> {
    let paste = state.repository.get_paste(&id).await?;
    let paste = paste.ok_or(AppError::PasteNotFound)?;

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

    state.repository.delete_paste(&id).await?;

    Ok(StatusCode::NO_CONTENT)
}
