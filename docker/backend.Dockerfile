# Stage 1: Build
FROM rust:slim AS builder
WORKDIR /usr/src/app

# Copy manifest files
COPY backend/Cargo.toml backend/Cargo.lock ./

# Create a dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

# Copy actual source code
COPY backend/src ./src

# Touch main.rs to force rebuild of the application
RUN touch src/main.rs
RUN cargo build --release

# Stage 2: Run
# Using distroless for minimal attack surface
FROM gcr.io/distroless/cc-debian12
COPY --from=builder /usr/src/app/target/release/ghostbin-server /usr/local/bin/ghostbin-server

ENV REDIS_URL=redis://redis:6379
EXPOSE 8080

USER nonroot:nonroot

CMD ["ghostbin-server"]
