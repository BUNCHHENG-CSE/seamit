#!/usr/bin/env bash
# ==============================================================================
# SeamIT - WSL Docker PostgreSQL Management Script
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

ACTION="${1:-up}"

case "$ACTION" in
  up|start)
    echo "======================================================================"
    echo " Starting SeamIT Production-Tuned PostgreSQL in WSL Docker..."
    echo "======================================================================"
    docker compose up -d seamit_postgres
    echo "Waiting for PostgreSQL to be healthy..."
    until docker compose ps seamit_postgres | grep -q "(healthy)"; do
      sleep 1
    done
    echo "PostgreSQL is HEALTHY and listening on port 5437!"
    echo "Connection URL: postgresql://seamit:seamit_secure_password@127.0.0.1:5437/seamit_db"
    ;;

  down|stop)
    echo "Stopping SeamIT PostgreSQL container..."
    docker compose stop seamit_postgres
    ;;

  restart)
    echo "Restarting SeamIT PostgreSQL container..."
    docker compose restart seamit_postgres
    ;;

  status)
    docker compose ps seamit_postgres
    ;;

  psql)
    echo "Opening psql shell inside seamit_postgres..."
    docker compose exec -it seamit_postgres psql -U seamit -d seamit_db
    ;;

  reset)
    echo "WARNING: Resetting all data in SeamIT PostgreSQL..."
    docker compose down -v
    docker compose up -d seamit_postgres
    echo "Database reset and re-initialized with production schema."
    ;;

  *)
    echo "Usage: $0 [up|down|restart|status|psql|reset]"
    exit 1
    ;;
esac
