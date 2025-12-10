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
    pub has_password: bool,
    pub salt: Option<String>,
    pub encrypted_key: Option<String>,
    pub key_iv: Option<String>,
    pub burn_token_hash: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreatePasteRequest {
    pub iv: String,
    pub data: String,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub burn_after_read: bool,
    pub views: i64,
    pub has_password: bool,
    pub salt: Option<String>,
    pub encrypted_key: Option<String>,
    pub key_iv: Option<String>,
    pub burn_token_hash: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreatePasteResponse {
    pub id: String,
}

impl CreatePasteRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.data.is_empty() {
            return Err("Data cannot be empty".to_string());
        }

        if self.iv.len() > 512 {
            return Err("IV too long".to_string());
        }

        if let Some(ref salt) = self.salt {
            if salt.len() > 512 {
                return Err("Salt too long".to_string());
            }
        }

        if let Some(ref key) = self.encrypted_key {
            if key.len() > 512 {
                return Err("Encrypted key too long".to_string());
            }
        }

        if let Some(ref iv) = self.key_iv {
            if iv.len() > 512 {
                return Err("Key IV too long".to_string());
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_empty_data() {
        let req = CreatePasteRequest {
            iv: "iv".to_string(),
            data: "".to_string(),
            created_at: 0,
            expires_at: None,
            burn_after_read: false,
            views: 0,
            has_password: false,
            salt: None,
            encrypted_key: None,
            key_iv: None,
            burn_token_hash: None,
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn test_validate_long_fields() {
        let long_string = "a".repeat(513);
        let req = CreatePasteRequest {
            iv: long_string.clone(),
            data: "data".to_string(),
            created_at: 0,
            expires_at: None,
            burn_after_read: false,
            views: 0,
            has_password: false,
            salt: None,
            encrypted_key: None,
            key_iv: None,
            burn_token_hash: None,
        };
        assert!(req.validate().is_err());

        let req = CreatePasteRequest {
            iv: "iv".to_string(),
            data: "data".to_string(),
            created_at: 0,
            expires_at: None,
            burn_after_read: false,
            views: 0,
            has_password: false,
            salt: Some(long_string.clone()),
            encrypted_key: None,
            key_iv: None,
            burn_token_hash: None,
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn test_validate_valid_payload() {
        let req = CreatePasteRequest {
            iv: "iv".to_string(),
            data: "data".to_string(),
            created_at: 0,
            expires_at: None,
            burn_after_read: false,
            views: 0,
            has_password: false,
            salt: None,
            encrypted_key: None,
            key_iv: None,
            burn_token_hash: None,
        };
        assert!(req.validate().is_ok());
    }
}
