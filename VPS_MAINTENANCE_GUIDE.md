# VPS Maintenance Guide - Docker Disk Space Management

## Server Details
- **IP**: 72.60.110.249
- **OS**: Ubuntu 22.04 (6.8.0-87-generic)
- **Disk**: 100 GB

---

## Common Disk Space Issues

### 1. Docker Build Cache (Biggest Culprit)
Every `docker build` creates cached layers. These accumulate quickly during development.

**Check size:**
```bash
docker system df
```

**Clean all build cache:**
```bash
docker builder prune -a -f
```

### 2. Dangling Images (`<none>:<none>`)
Old image layers that are no longer tagged. Created when rebuilding images.

**Check:**
```bash
docker images -f "dangling=true"
```

**Clean:**
```bash
docker image prune -f
```

### 3. Unused Images
Images not used by any container.

**Clean (careful - removes all unused):**
```bash
docker image prune -a -f
```

### 4. Stopped Containers
Containers that exited but weren't removed.

**Check:**
```bash
docker ps -a -f "status=exited"
```

**Clean:**
```bash
docker container prune -f
```

### 5. Unused Volumes
Volumes not attached to any container.

**Check:**
```bash
docker volume ls -f "dangling=true"
```

**Clean:**
```bash
docker volume prune -f
```

### 6. Docker Logs
Container logs can grow indefinitely.

**Check log sizes:**
```bash
du -h /var/lib/docker/containers/*/*-json.log
```

**Truncate a specific container's logs:**
```bash
truncate -s 0 /var/lib/docker/containers/<container_id>/*-json.log
```

**Configure log rotation (add to docker-compose.yml):**
```yaml
services:
  myservice:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Quick Cleanup Commands

### Safe Cleanup (keeps running containers and their images)
```bash
# Remove stopped containers
docker container prune -f

# Remove dangling images
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Remove build cache
docker builder prune -f
```

### Aggressive Cleanup (removes everything unused)
```bash
docker system prune -a -f --volumes
```
**Warning:** This removes ALL unused images, not just dangling ones.

### Nuclear Option (full reset)
```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -a -q)

# Remove all images
docker rmi $(docker images -q)

# Remove all volumes
docker volume rm $(docker volume ls -q)

# Remove all networks
docker network prune -f

# Clear build cache
docker builder prune -a -f
```

---

## Recommended Maintenance Schedule

### Weekly
```bash
# Remove dangling images and stopped containers
docker image prune -f
docker container prune -f
```

### Monthly
```bash
# Full cleanup (safe version)
docker system prune -f
docker builder prune -f
```

### After Major Deployments
```bash
# Clean old build cache
docker builder prune --filter "until=24h" -f
```

---

## Monitoring Commands

### Check Overall Docker Disk Usage
```bash
docker system df -v
```

### Check Specific Directory Sizes
```bash
du -h --max-depth=2 /var/lib/docker | sort -hr | head -20
```

### Check Total Disk Usage
```bash
df -h /
```

---

## Automation Script

Create `/root/docker-cleanup.sh`:
```bash
#!/bin/bash
echo "=== Docker Cleanup Started ==="
echo "Before cleanup:"
docker system df

echo ""
echo "Removing stopped containers..."
docker container prune -f

echo ""
echo "Removing dangling images..."
docker image prune -f

echo ""
echo "Removing unused volumes..."
docker volume prune -f

echo ""
echo "Removing build cache older than 7 days..."
docker builder prune --filter "until=168h" -f

echo ""
echo "After cleanup:"
docker system df
echo "=== Cleanup Complete ==="
```

Make executable and add to cron:
```bash
chmod +x /root/docker-cleanup.sh

# Run weekly on Sunday at 3 AM
echo "0 3 * * 0 /root/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1" | crontab -
```

---

## Current Server Analysis (Jan 2026)

| Component | Size | Action |
|-----------|------|--------|
| Build Cache | 22.6 GB | `docker builder prune -a -f` |
| Dangling Images | ~5 GB | `docker image prune -f` |
| MySQL Data | 2.5 GB | Keep (production data) |
| Active Containers | ~200 MB | Keep |

**Expected savings: ~25 GB**
