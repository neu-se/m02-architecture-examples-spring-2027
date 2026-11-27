#!/usr/bin/env bash
# Demo: walk through the enrollment story with curl.
# Start the server in another terminal first, with an empty data file:
#   rm -f enrollment-data.json && npm start
# Usage: ./demo.sh            the whole story
#        ./demo.sh restart    after stopping and restarting the server:
#                             shows that the data survived
# Optional: PORT=3000 ADMIN_PASSWORD=... (the demo defaults match the server's)

URL="http://localhost:${PORT:-3000}"
ADMIN="{\"user\":\"admin\",\"password\":\"${ADMIN_PASSWORD:-demo-admin-password}\"}"
SAM='{"user":"sam","password":"pw-sam"}'

# Send one request and print what we sent and what came back.
call() {
  echo "--> POST $1  $2"
  curl -s -w "\n<-- HTTP %{http_code}\n\n" -X POST "$URL$1" \
    -H "Content-Type: application/json" -d "$2"
}

if [ "$1" = "restart" ]; then
  echo "== After the restart: sam dropped yoga earlier, so this must still fail"
  call /activities/yoga/signups "$SAM"                      # 409 previously-dropped
  exit 0
fi

echo "== The admin creates activities"
for name in yoga chess swim climb; do
  call /activities "{\"user\":\"admin\",\"password\":\"${ADMIN_PASSWORD:-demo-admin-password}\",\"name\":\"$name\"}"
done
call /activities '{"user":"admin","password":"wrong","name":"polo"}'   # 401
call /activities "{\"user\":\"sam\",\"password\":\"pw-sam\",\"name\":\"polo\"}"  # 401, sam does not exist yet

echo "== Anyone can create a student, but not another admin"
call /students "$SAM"                                       # 201
call /students "$SAM"                                       # 409 duplicate
call /students '{"user":"admin","password":"mine"}'         # 400 reserved
call /activities "{\"user\":\"sam\",\"password\":\"pw-sam\",\"name\":\"polo\"}"  # 403, only the admin

echo "== Sam signs up: at most 3 activities"
call /activities/yoga/signups "$SAM"                        # 200
call /activities/yoga/signups "$SAM"                        # 409 already-enrolled
call /activities/chess/signups "$SAM"                       # 200
call /activities/swim/signups "$SAM"                        # 200
call /activities/climb/signups "$SAM"                       # 409 limit
call /activities/polo/signups "$SAM"                        # 404 no such activity

echo "== Dropping frees a slot, but that activity is closed to sam for good"
call /activities/yoga/drops "$SAM"                          # 200
call /activities/climb/signups "$SAM"                       # 200
call /activities/yoga/signups "$SAM"                        # 409 previously-dropped
call /activities/chess/drops '{"user":"sam","password":"wrong"}'  # 401
call /activities/yoga/drops "$SAM"                          # 409 not-enrolled

echo "== Now stop the server, start it again, and run:  ./demo.sh restart"
