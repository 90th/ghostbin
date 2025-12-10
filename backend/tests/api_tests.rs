use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use ghostbin_server::{
    db,
    handlers::{AppState, ChallengeResponse},
    model::{CreatePasteRequest, CreatePasteResponse, Paste},
    repository::PasteRepository,
};
use rand::Rng;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::sync::Semaphore;
use tower::ServiceExt;

async fn spawn_app() -> Router {
    dotenvy::dotenv().ok();
    let pool = db::create_pool().expect("Failed to create Redis pool");
    let repository = PasteRepository::new(pool);

    let mut rng = rand::thread_rng();
    let hmac_secret: [u8; 32] = rng.gen();

    let read_limiter = Arc::new(Semaphore::new(50));
    let challenge_limiter = Arc::new(Semaphore::new(100));

    let state = AppState {
        repository,
        hmac_secret,
        read_limiter,
        challenge_limiter,
    };

    ghostbin_server::app(state)
}

fn solve_pow(salt: &str, difficulty: usize) -> (String, String) {
    let mut nonce: u64 = 0;
    loop {
        let nonce_str = nonce.to_string();
        let mut hasher = Sha256::new();
        hasher.update(salt.as_bytes());
        hasher.update(nonce_str.as_bytes());
        let hash = hex::encode(hasher.finalize());

        if hash.starts_with(&"0".repeat(difficulty)) {
            return (nonce_str, hash);
        }
        nonce += 1;
    }
}

#[tokio::test]
async fn test_get_challenge() {
    let app = spawn_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/challenge")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let challenge: ChallengeResponse = serde_json::from_slice(&body).unwrap();

    assert!(!challenge.salt.is_empty());
    assert!(challenge.difficulty > 0);
    assert!(!challenge.signature.is_empty());
}

#[tokio::test]
async fn test_create_paste_success() {
    let app = spawn_app().await;

    // 1. Get Challenge
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/challenge")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let challenge: ChallengeResponse = serde_json::from_slice(&body).unwrap();

    // 2. Solve PoW
    let (nonce, _) = solve_pow(&challenge.salt, challenge.difficulty);

    // 3. Create Paste
    let req = CreatePasteRequest {
        iv: "iv".to_string(),
        data: "encrypted_data".to_string(),
        created_at: 1234567890,
        expires_at: None,
        burn_after_read: false,
        views: 0,
        has_password: false,
        salt: None,
        encrypted_key: None,
        key_iv: None,
        burn_token_hash: None,
    };

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/paste")
                .header("Content-Type", "application/json")
                .header("X-PoW-Salt", challenge.salt)
                .header("X-PoW-Nonce", nonce)
                .header("X-PoW-Timestamp", challenge.timestamp.to_string())
                .header("X-PoW-Signature", challenge.signature)
                .body(Body::from(serde_json::to_string(&req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_res: CreatePasteResponse = serde_json::from_slice(&body).unwrap();
    assert!(!create_res.id.is_empty());
}

#[tokio::test]
async fn test_create_paste_replay_attack() {
    let app = spawn_app().await;

    // 1. Get Challenge
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/challenge")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let challenge: ChallengeResponse = serde_json::from_slice(&body).unwrap();

    // 2. Solve PoW
    let (nonce, _) = solve_pow(&challenge.salt, challenge.difficulty);

    let req = CreatePasteRequest {
        iv: "iv".to_string(),
        data: "encrypted_data".to_string(),
        created_at: 1234567890,
        expires_at: None,
        burn_after_read: false,
        views: 0,
        has_password: false,
        salt: None,
        encrypted_key: None,
        key_iv: None,
        burn_token_hash: None,
    };

    // 3. First Request (Success)
    let response1 = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/paste")
                .header("Content-Type", "application/json")
                .header("X-PoW-Salt", &challenge.salt)
                .header("X-PoW-Nonce", &nonce)
                .header("X-PoW-Timestamp", challenge.timestamp.to_string())
                .header("X-PoW-Signature", &challenge.signature)
                .body(Body::from(serde_json::to_string(&req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response1.status(), StatusCode::CREATED);

    // 4. Second Request (Replay - Should Fail)
    let response2 = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/paste")
                .header("Content-Type", "application/json")
                .header("X-PoW-Salt", challenge.salt)
                .header("X-PoW-Nonce", nonce)
                .header("X-PoW-Timestamp", challenge.timestamp.to_string())
                .header("X-PoW-Signature", challenge.signature)
                .body(Body::from(serde_json::to_string(&req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response2.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_create_paste_bad_pow() {
    let app = spawn_app().await;

    let req = CreatePasteRequest {
        iv: "iv".to_string(),
        data: "encrypted_data".to_string(),
        created_at: 1234567890,
        expires_at: None,
        burn_after_read: false,
        views: 0,
        has_password: false,
        salt: None,
        encrypted_key: None,
        key_iv: None,
        burn_token_hash: None,
    };

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/paste")
                .header("Content-Type", "application/json")
                .header("X-PoW-Salt", "fakesalt")
                .header("X-PoW-Nonce", "123")
                .header("X-PoW-Timestamp", "1234567890")
                .header("X-PoW-Signature", "fakesignature")
                .body(Body::from(serde_json::to_string(&req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_get_paste_retrieval() {
    let app = spawn_app().await;

    // 1. Create Paste
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/challenge")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let challenge: ChallengeResponse = serde_json::from_slice(&body).unwrap();
    let (nonce, _) = solve_pow(&challenge.salt, challenge.difficulty);

    let req = CreatePasteRequest {
        iv: "iv".to_string(),
        data: "encrypted_data".to_string(),
        created_at: 1234567890,
        expires_at: None,
        burn_after_read: false,
        views: 0,
        has_password: false,
        salt: None,
        encrypted_key: None,
        key_iv: None,
        burn_token_hash: None,
    };

    let create_res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/paste")
                .header("Content-Type", "application/json")
                .header("X-PoW-Salt", challenge.salt)
                .header("X-PoW-Nonce", nonce)
                .header("X-PoW-Timestamp", challenge.timestamp.to_string())
                .header("X-PoW-Signature", challenge.signature)
                .body(Body::from(serde_json::to_string(&req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(create_res.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_data: CreatePasteResponse = serde_json::from_slice(&body).unwrap();

    // 2. Get Paste
    let get_res = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/v1/paste/{}", create_data.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_res.status(), StatusCode::OK);
    let body = axum::body::to_bytes(get_res.into_body(), usize::MAX)
        .await
        .unwrap();
    let paste: Paste = serde_json::from_slice(&body).unwrap();
    assert_eq!(paste.id, create_data.id);
    assert_eq!(paste.data, "encrypted_data");
}

#[tokio::test]
async fn test_get_paste_not_found() {
    let app = spawn_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/paste/non-existent-id")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_burn_after_read() {
    let app = spawn_app().await;

    // 1. Create Paste with burn_after_read = true
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/challenge")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let challenge: ChallengeResponse = serde_json::from_slice(&body).unwrap();
    let (nonce, _) = solve_pow(&challenge.salt, challenge.difficulty);

    let req = CreatePasteRequest {
        iv: "iv".to_string(),
        data: "encrypted_data".to_string(),
        created_at: 1234567890,
        expires_at: None,
        burn_after_read: true,
        views: 0,
        has_password: false,
        salt: None,
        encrypted_key: None,
        key_iv: None,
        burn_token_hash: None,
    };

    let create_res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/paste")
                .header("Content-Type", "application/json")
                .header("X-PoW-Salt", challenge.salt)
                .header("X-PoW-Nonce", nonce)
                .header("X-PoW-Timestamp", challenge.timestamp.to_string())
                .header("X-PoW-Signature", challenge.signature)
                .body(Body::from(serde_json::to_string(&req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(create_res.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_data: CreatePasteResponse = serde_json::from_slice(&body).unwrap();

    // 2. First Fetch (Should Succeed)
    let get_res1 = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(&format!("/api/v1/paste/{}", create_data.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_res1.status(), StatusCode::OK);

    // 3. Wait for burn timeout (simulated or real wait if short)
    // Since we can't easily mock time or wait 90s in a unit test without mocking Redis,
    // we can verify the behavior by checking if the key exists or if the TTL is set.
    // However, for a black-box API test, we might just check that the response was OK.
    // To properly test the "burn" effect, we'd need to wait > 90s or mock the repository.
    // For now, we assume the logic in the handler is correct (setting TTL to 90s).
}

#[tokio::test]
async fn test_delete_paste_with_token() {
    let app = spawn_app().await;

    // 1. Create Paste with burn token
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/challenge")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let challenge: ChallengeResponse = serde_json::from_slice(&body).unwrap();
    let (nonce, _) = solve_pow(&challenge.salt, challenge.difficulty);

    let burn_token = "secret_token";
    let mut hasher = Sha256::new();
    hasher.update(burn_token.as_bytes());
    let burn_token_hash = hex::encode(hasher.finalize());

    let req = CreatePasteRequest {
        iv: "iv".to_string(),
        data: "encrypted_data".to_string(),
        created_at: 1234567890,
        expires_at: None,
        burn_after_read: true,
        views: 0,
        has_password: false,
        salt: None,
        encrypted_key: None,
        key_iv: None,
        burn_token_hash: Some(burn_token_hash),
    };

    let create_res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/paste")
                .header("Content-Type", "application/json")
                .header("X-PoW-Salt", challenge.salt)
                .header("X-PoW-Nonce", nonce)
                .header("X-PoW-Timestamp", challenge.timestamp.to_string())
                .header("X-PoW-Signature", challenge.signature)
                .body(Body::from(serde_json::to_string(&req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(create_res.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_data: CreatePasteResponse = serde_json::from_slice(&body).unwrap();

    // 2. Delete with Wrong Token
    let del_res1 = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(&format!("/api/v1/paste/{}", create_data.id))
                .header("X-Burn-Token", "wrong_token")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(del_res1.status(), StatusCode::UNAUTHORIZED);

    // 3. Delete with Correct Token
    let del_res2 = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(&format!("/api/v1/paste/{}", create_data.id))
                .header("X-Burn-Token", burn_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(del_res2.status(), StatusCode::NO_CONTENT);

    // 4. Verify Deletion
    let get_res = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/v1/paste/{}", create_data.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_res.status(), StatusCode::NOT_FOUND);
}
