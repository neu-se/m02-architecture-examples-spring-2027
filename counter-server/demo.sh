#!/usr/bin/env bash
# Demo: call the running server with curl.
# Start the server in another terminal first:  npm start
# Usage: ./demo.sh [port]      (default port: 3000)

URL="http://localhost:${1:-3000}/count"

# Send one request and print what we sent and what came back.
call() {
  echo "--> $1"
  curl -s -w "\n<-- HTTP %{http_code}\n\n" -X POST "$URL" \
    -H "Content-Type: application/json" -d "$1"
}

call '{"user":"alice","password":"secret"}'   # authorized: count 1
call '{"user":"alice","password":"secret"}'   # authorized: count 2
call '{"user":"alice","password":"wrong"}'    # 401, not counted
call '{"user":"alice"}'                       # 400 (no password), not counted
call '{bad json'                              # 400 (not JSON), not counted
call '{"user":"alice","password":"secret"}'   # authorized: count 3
