# Default recipe: start containers and enter Nushell
default: enter

# Start sandbox and postgres in background
up:
    @mkdir -p workspace .cache/home .cache/postgres
    arion up -d

# Stop and tear down containers
down:
    arion down

# Drop into the interactive shell (launches Nushell via defaultExec)
enter:
    arion run sandbox nu

enter-exec:
    arion exec sandbox

# Follow container logs
logs:
    arion logs -f

# sudo rm -rf ./.cache/postgres/
# Run SvelteKit dev server directly inside the sandbox
dev:
    arion run --service-ports sandbox bun run dev -- --host 0.0.0.0 --port 3000

# Push Drizzle schema to PostgreSQL
db-push:
    arion run sandbox bun run db:push

# Generate Drizzle migrations
db-generate:
    arion run sandbox bun run db:generate
