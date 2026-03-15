#!/bin/bash
# Sarasota Automotive – deploy to VPS 187.124.225.101
# This script runs the single deploy script. Use one command:
#
#   ./deploy-sarasota-187.sh           incremental deploy
#   ./deploy-sarasota-187.sh --clean  clean app, keep database
#   ./deploy-sarasota-187.sh --clean-all  clean app and database
#
# (Same as ./deploy.sh; this file is a convenience wrapper.)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/deploy.sh" "$@"
