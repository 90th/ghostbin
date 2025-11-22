use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

pub enum AppError {
    PasteNotFound,
    Unauthorized(String),
    BadRequest(String),
    Conflict(String),
    TooManyRequests,
    InternalServerError,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::PasteNotFound => (StatusCode::NOT_FOUND, "Paste not found".to_string()),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            AppError::TooManyRequests => (
                StatusCode::TOO_MANY_REQUESTS,
                "Server busy, please try again later".to_string(),
            ),
            AppError::InternalServerError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
        };

        let body = Json(json!({
            "error": error_message
        }));

        (status, body).into_response()
    }
}

impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(_err: E) -> Self {
        Self::InternalServerError
    }
}
