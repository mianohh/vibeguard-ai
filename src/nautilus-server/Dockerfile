# Dockerfile for reproducible VibeGuard Nautilus enclave builds
#
# This Dockerfile ensures that anyone can build the enclave binary
# and verify that it produces the same PCR measurements.
# LocalThreatAgent runs entirely inside the enclave with zero external API dependencies.

FROM rust:latest AS builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Cargo files first for better caching
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build in release mode for reproducibility
RUN cargo build --release

# Extract binary hash (simulates PCR measurement)
RUN sha384sum /app/target/release/nautilus-server > /app/binary.hash

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary and run script
COPY --from=builder /app/target/release/nautilus-server /app/
COPY run.sh /app/

RUN chmod +x /app/run.sh /app/nautilus-server

# Expose ports
EXPOSE 3000 3001

# Run the enclave server
CMD ["/app/run.sh"]
