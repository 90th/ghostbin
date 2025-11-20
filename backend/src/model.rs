use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Paste {
    pub id: String,
    pub iv: String,
    pub data: String,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub burn_after_read: bool,
    pub views: i64,
    pub language: String,
    pub has_password: bool,
    pub salt: Option<String>,
    pub encrypted_key: Option<String>,
    pub key_iv: Option<String>,
    pub burn_token_hash: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreatePasteRequest {
    pub iv: String,
    pub data: String,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub burn_after_read: bool,
    pub views: i64,
    pub language: String,
    pub has_password: bool,
    pub salt: Option<String>,
    pub encrypted_key: Option<String>,
    pub key_iv: Option<String>,
    pub burn_token_hash: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
pub struct CreatePasteResponse {
    pub id: String,
}
