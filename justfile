# Build and copy the compose YAML to pwd so relative volume paths resolve to the project root
_build := `cp -f $(nix build .#composeYaml --no-link --print-out-paths) .tmp-arion-compose.yaml && chmod +w .tmp-arion-compose.yaml`

export COMPOSE_PROJECT_NAME := "web3-sandbox"
arion := "arion --prebuilt-file ./.tmp-arion-compose.yaml"

# Default recipe: start containers and enter Nushell
default: enter

setup:
    @mkdir -p workspace .cache/home/.config/nushell/ .cache/home/.cache/oh-my-posh/ .cache/postgres/

# Start sandbox and postgres in background
up: setup
    {{ arion }} up -d

# Stop and tear down containers
down:
    {{ arion }} down

# Drop into an interactive shell in a new container
enter: setup
    {{ arion }} run sandbox nu

# Exec into an already-running sandbox container
enter-exec: setup
    {{ arion }} exec sandbox

attach: setup
    docker attach web3-sandbox-sandbox-1

# Follow container logs
logs: setup
    {{ arion }} logs -f

# Run SvelteKit dev server directly inside the sandbox (mapping exposed ports)
dev: setup
    {{ arion }} run --service-ports sandbox bun run dev -- --host 0.0.0.0 --port 3000

# Push Drizzle schema to PostgreSQL
db-push: setup
    {{ arion }} run sandbox bun run db:push

# Generate Drizzle migrations
db-generate: setup
    {{ arion }} run sandbox bun run db:generate

clear:
    sudo rm -rf ./.cache/
