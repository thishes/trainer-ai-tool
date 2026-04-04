#!/bin/bash
echo "Starting backend server..."
cd "$(dirname "$0")/server"
node index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 3

echo "Starting frontend server..."
cd "$(dirname "$0")/client"
node node_modules/vite/bin/vite.js > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

sleep 3

echo "================================"
echo "Services started!"
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:8080"
echo "================================"

# Check if services are running
if lsof -ti:3000 > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend failed to start. Check /tmp/backend.log"
fi

if lsof -ti:8080 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend failed to start. Check /tmp/frontend.log"
fi
