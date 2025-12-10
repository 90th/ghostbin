use crate::error::AppError;
use crate::model::Paste;
use deadpool_redis::redis::AsyncCommands;
use deadpool_redis::Pool;

#[derive(Clone)]
pub struct PasteRepository {
    pool: Pool,
}

impl PasteRepository {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    pub async fn save_paste(&self, paste: Paste, ttl_seconds: u64) -> Result<(), AppError> {
        let mut con = self
            .pool
            .get()
            .await
            .map_err(|_| AppError::InternalServerError)?;

        let key = format!("paste:{}", paste.id);
        let json = serde_json::to_string(&paste).map_err(|_| AppError::InternalServerError)?;

        let result: Option<String> = deadpool_redis::redis::cmd("SET")
            .arg(&key)
            .arg(json)
            .arg("NX")
            .arg("EX")
            .arg(ttl_seconds)
            .query_async(&mut con)
            .await
            .map_err(|_| AppError::InternalServerError)?;

        if result.is_none() {
            return Err(AppError::Conflict("Paste ID already exists".to_string()));
        }

        Ok(())
    }

    pub async fn get_paste(&self, id: &str) -> Result<Option<Paste>, AppError> {
        let mut con = self
            .pool
            .get()
            .await
            .map_err(|_| AppError::InternalServerError)?;

        let key = format!("paste:{}", id);
        let json: Option<String> = con
            .get(&key)
            .await
            .map_err(|_| AppError::InternalServerError)?;

        match json {
            Some(j) => {
                let paste: Paste =
                    serde_json::from_str(&j).map_err(|_| AppError::InternalServerError)?;
                Ok(Some(paste))
            }
            None => Ok(None),
        }
    }

    pub async fn increment_views(&self, mut paste: Paste) -> Result<Paste, AppError> {
        let mut con = self
            .pool
            .get()
            .await
            .map_err(|_| AppError::InternalServerError)?;

        let key = format!("paste:{}", paste.id);
        paste.views += 1;

        let new_json = serde_json::to_string(&paste).map_err(|_| AppError::InternalServerError)?;

        let _: () = deadpool_redis::redis::cmd("SET")
            .arg(&key)
            .arg(new_json)
            .arg("KEEPTTL")
            .query_async(&mut con)
            .await
            .map_err(|_| AppError::InternalServerError)?;

        Ok(paste)
    }

    pub async fn set_burn_timeout(&self, id: &str, seconds: u64) -> Result<(), AppError> {
        let mut con = self
            .pool
            .get()
            .await
            .map_err(|_| AppError::InternalServerError)?;

        let key = format!("paste:{}", id);
        let _: () = con
            .expire(&key, seconds as i64)
            .await
            .map_err(|_| AppError::InternalServerError)?;
        Ok(())
    }

    pub async fn delete_paste(&self, id: &str) -> Result<(), AppError> {
        let mut con = self
            .pool
            .get()
            .await
            .map_err(|_| AppError::InternalServerError)?;

        let key = format!("paste:{}", id);
        let _: () = con
            .del(&key)
            .await
            .map_err(|_| AppError::InternalServerError)?;
        Ok(())
    }

    pub async fn mark_salt_used(&self, salt: &str) -> Result<bool, AppError> {
        let mut con = self
            .pool
            .get()
            .await
            .map_err(|_| AppError::InternalServerError)?;

        let salt_key = format!("pow:salt:{}", salt);

        let set_result: Option<String> = deadpool_redis::redis::cmd("SET")
            .arg(&salt_key)
            .arg("used")
            .arg("NX")
            .arg("EX")
            .arg(120)
            .query_async(&mut con)
            .await
            .map_err(|_| AppError::InternalServerError)?;

        Ok(set_result.is_some())
    }
}
