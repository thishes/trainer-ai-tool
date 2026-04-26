#!/usr/bin/expect -f
set timeout 300
log_user 1

spawn ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 ubuntu@43.153.192.88

expect {
    "password:" {
        send {Hejinqiang860612!\r}
    }
    "Permission denied" {
        puts "\nAUTH FAILED"
        exit 1
    }
}

puts "\n>>> Waiting for shell prompt..."
sleep 5
expect {
    -re {[#$] } { puts "\n>>> SHELL READY" }
    timeout { puts "\n>>> SHELL TIMEOUT"; exit 1 }
}
sleep 1

puts "\n=== STEP 1: Pull ==="
send {cd /var/www/exam-site && sudo git pull origin master 2>&1\r}
expect {
    "password:" {
        send {Hejinqiang860612!\r}
        exp_continue
    }
    -re {[#$] } {}
    timeout { puts "\nPULL TIMEOUT" }
}
sleep 2

puts "\n=== STEP 2: Build ==="
send {cd /var/www/exam-site/client && npm run build 2>&1 | tail -20\r}
expect {
    -re {[#$] } {}
    timeout { puts "\nBUILD TIMEOUT" }
}
sleep 2

puts "\n=== STEP 3: Restart ==="
send {sudo pm2 restart all 2>&1\r}
expect {
    "password:" {
        send {Hejinqiang860612!\r}
        exp_continue
    }
    -re {[#$] } {}
}
sleep 5

puts "\n=== STEP 4: Status ==="
send {pm2 status\r}
expect -re {[#$] }
sleep 2

puts "\n=== STEP 5: Health Check ==="
send {curl -s http://localhost:3000/api/exam/test 2>&1\r}
expect -re {[#$] }

puts "\n\n========== DONE =========="
send {exit\r}
expect eof
