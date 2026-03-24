# Troubleshooting Guide - Cron Jobs Testing

## Error: getaddrinfo EAI_AGAIN scheduler

**Problem:** The API Gateway cannot reach the Scheduler service

**Cause:** The hostname "scheduler" is not resolvable. This happens when:
- Services are running locally (not in Docker)
- Services are not on the same Docker network
- Scheduler service is not listening on the expected port

### Solution 1: Running Locally (Development)

If you're running services on your local machine:

```bash
cd scheduler
npm run start:dev

cd api-gateway
npm run start:dev
```

**Set environment variable:**
```bash
export SCHEDULER_MS_HOST=localhost
export SCHEDULER_PORT=3003
```

**Test:**
```bash
curl -X POST http://localhost:3000/admin/cron-test/all
```

### Solution 2: Running in Docker

If you're using Docker Compose:

```bash
docker-compose up -d scheduler api-gateway
```

**Ensure service names match in docker-compose.yml:**
```yaml
services:
  scheduler:
    container_name: scheduler
    ports:
      - "3003:3003"
```

**Set environment variable in docker-compose or .env:**
```
SCHEDULER_MS_HOST=scheduler
SCHEDULER_PORT=3003
```

**Test:**
```bash
docker exec api-gateway curl -X POST http://scheduler:3003/scheduler/trigger-nutrition-summary

# Or from outside container
curl -X POST http://localhost:3000/admin/cron-test/all
```

### Solution 3: Verify Services are Running

**Check if scheduler is running and listening:**

```bash
# Local development
lsof -i :3003
# or
netstat -an | grep 3003

# Docker
docker port scheduler
docker logs scheduler
```

**Expected output from scheduler logs:**
```
[Nest] 32003  - 03/24/2026, 6:04:48 PM     LOG Scheduler service listening on HTTP port 3003
```

### Solution 4: Check Network Connectivity

**Test from API Gateway container:**
```bash
docker exec api-gateway curl -v http://scheduler:3003/scheduler/trigger-nutrition-summary
```

**Expected response:**
- Either `{"success": true, ...}` (if data exists)
- Or error related to missing data, NOT network error

---

## Common Errors & Solutions

### Error: "Cannot POST /scheduler/trigger-*"

**Problem:** The trigger endpoints don't exist

**Solution:** Verify scheduler service is running with HTTP support:
```bash
docker logs scheduler | grep -i "listening\|http"
```

**Check scheduler/src/main.ts includes:**
```typescript
await app.listen(httpPort, '0.0.0.0', () => {
  console.log(`Scheduler service listening on HTTP port ${httpPort}`);
});
```

### Error: "ECONNREFUSED"

**Problem:** Connection refused on the specified port

**Solution:**
1. Verify port isn't already in use: `lsof -i :3003`
2. Check firewall rules
3. Try different port: `SCHEDULER_PORT=3004 npm run start:dev`

### Error: "ETIMEDOUT"

**Problem:** Connection timeout

**Solution:**
1. Increase timeout in axios: `timeout: 30000` (in cron-test.service.ts)
2. Check scheduler service is responsive: `curl http://localhost:3003/scheduler/trigger-nutrition-summary`
3. Check system resources: `docker stats`

---

## Environment Variables Reference

### API Gateway (.env or .env.local)

```bash
# For local development (localhost)
SCHEDULER_MS_HOST=localhost
SCHEDULER_PORT=3003

# For Docker
# SCHEDULER_MS_HOST=scheduler
# SCHEDULER_PORT=3003
```

### Scheduler Service (.env or docker-compose.yml)

```bash
SCHEDULER_PORT=3003
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
RABBITMQ_HOST=rabbitmq
REDIS_HOST=redis
```

### Mailer Service (.env or docker-compose.yml)

```bash
RABBITMQ_HOST=rabbitmq
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM=noreply@hygieia.app
```

---

## Debug Checklist

- [ ] Is scheduler service running?
  ```bash
  ps aux | grep scheduler
  # or
  docker ps | grep scheduler
  ```

- [ ] Is scheduler listening on port 3003?
  ```bash
  curl http://localhost:3003/scheduler/trigger-nutrition-summary
  ```

- [ ] Is api-gateway able to reach scheduler?
  ```bash
  docker exec api-gateway ping scheduler  # Docker
  ping localhost                          # Local dev
  ```

- [ ] Are RabbitMQ and other dependencies running?
  ```bash
  docker-compose ps
  ```

- [ ] Check all environment variables are set:
  ```bash
  env | grep SCHEDULER
  env | grep RABBITMQ
  ```

- [ ] Check logs for actual errors:
  ```bash
  docker logs scheduler -f
  docker logs api-gateway -f
  docker logs mailer -f
  ```

---

## Quick Fix - Restart Everything

```bash
# Stop all services
docker-compose down

# Remove volumes if needed (careful!)
# docker-compose down -v

# Start fresh
docker-compose up -d

# Check status
docker-compose ps
docker logs scheduler
docker logs api-gateway

# Test
curl -X POST http://localhost:3000/admin/cron-test/all
```

---

## Testing Different Configurations

### Config 1: All Services in Docker

```bash
# docker-compose.yml
SCHEDULER_MS_HOST=scheduler
SCHEDULER_PORT=3003

# Test
docker exec api-gateway curl -X POST http://scheduler:3003/scheduler/trigger-nutrition-summary
```

### Config 2: Scheduler Local, API-Gateway in Docker

```bash
# Scheduler local
cd scheduler && npm run start:dev

# docker-compose.yml
SCHEDULER_MS_HOST=host.docker.internal  # Special Docker hostname for host machine
SCHEDULER_PORT=3003

# Test
docker exec api-gateway curl -X POST http://host.docker.internal:3003/scheduler/trigger-nutrition-summary
```

### Config 3: All Services Local

```bash
# Terminal 1
cd scheduler && npm run start:dev

# Terminal 2
cd api-gateway && npm run start:dev

# Set env
export SCHEDULER_MS_HOST=localhost
export SCHEDULER_PORT=3003

# Terminal 3 - Test
curl -X POST http://localhost:3000/admin/cron-test/all
```

---

## Performance Notes

- Initial request may take 1-2 seconds (service startup)
- Subsequent requests should be <500ms
- If consistently >5 seconds, check:
  - Database performance
  - RabbitMQ connection speed
  - Network latency

---

## Still Having Issues?

1. **Check logs in this order:**
   - API Gateway logs (connection issues)
   - Scheduler logs (execution errors)
   - Mailer logs (email sending errors)

2. **Collect diagnostic info:**
   ```bash
   docker-compose ps
   docker logs scheduler | tail -50
   docker logs api-gateway | tail -50
   env | grep -E "SCHEDULER|RABBITMQ|SMTP"
   ```

3. **Test connectivity:**
   ```bash
   curl -v http://localhost:3003/scheduler/trigger-nutrition-summary
   ```

4. **Check database:**
   ```sql
   SELECT COUNT(*) FROM diet_plan;
   SELECT COUNT(*) FROM fitness;
   SELECT COUNT(*) FROM prescriptions;
   ```

---

## Support Information

For additional issues, please check:
- `docs/CRON_TESTING_GUIDE.md` - Comprehensive testing guide
- `docs/CRON_JOBS_GUIDE.md` - Architecture documentation
- `IMPLEMENTATION_COMPLETE.md` - Implementation summary
