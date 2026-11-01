#!/usr/bin/env bash
# start.sh
# bash / start.sh / runtime / macos & linux

set -e
PORT=${PORT:-3000}
echo "[mimi]: starting DoFree cinema vip server on port $PORT..."
node server.js

