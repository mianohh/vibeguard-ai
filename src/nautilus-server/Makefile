# VibeGuard Nautilus Server Makefile
# Reproducible build system for AWS Nitro Enclaves

.PHONY: build run clean pcrs test simulate

# Build enclave image
build:
	@echo "🔨 Building VibeGuard Nautilus enclave..."
	@mkdir -p out
	cargo build --release
	@echo "✅ Build complete"

# Generate PCR measurements (requires Docker and Nitro CLI)
pcrs: build
	@echo "📊 Generating PCR measurements..."
	@mkdir -p out
	# In production, use nitro-cli build-enclave
	# For now, generate mock PCRs for testing
	@echo "PCR0=911c87d0abc8c9840a0810d57dfb718865f35dc42010a2d5b30e7840b03edeea83a26aad51593ade1e47ab6cced4653e" > out/nitro.pcrs
	@echo "PCR1=911c87d0abc8c9840a0810d57dfb718865f35dc42010a2d5b30e7840b03edeea83a26aad51593ade1e47ab6cced4653e" >> out/nitro.pcrs
	@echo "PCR2=21b9efbc184807662e966d34f390821309eeac6802309798826296bf3e8bec7c10edb30948c90ba67310f7b964fc500a" >> out/nitro.pcrs
	@cat out/nitro.pcrs
	@echo "✅ PCRs generated"

# Simulate AWS Nitro Enclave locally with Docker
simulate:
	@echo "🔒 Simulating AWS Nitro Enclave..."
	@bash ../../scripts/simulate-nitro-enclave.sh

# Run server locally (for testing, not in enclave)
run: build
	@echo "🚀 Starting VibeGuard Nautilus server (local mode)..."
	RUST_LOG=info cargo run --release

# Run with Nitro features (requires Linux + Nitro hardware)
run-nitro: build
	@echo "🚀 Starting VibeGuard Nautilus server (Nitro mode)..."
	RUST_LOG=info cargo run --release --features nitro

# Run tests
test:
	@echo "🧪 Running tests..."
	cargo test --all-features
	@echo "✅ Tests passed"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	cargo clean
	rm -rf out/
	@echo "✅ Clean complete"

# Local development server (hot reload)
dev:
	@echo "🔧 Starting development server..."
	RUST_LOG=debug cargo watch -x 'run'

# Check code formatting
fmt:
	cargo fmt --all -- --check

# Run linter
lint:
	cargo clippy --all-features -- -D warnings

# Full CI check
ci: fmt lint test
	@echo "✅ All CI checks passed"
