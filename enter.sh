#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Start the pure Nix container in the background
arion up -d

# Drop into the interactive shell inside the container
arion exec sandbox bash
