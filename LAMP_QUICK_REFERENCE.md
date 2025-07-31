# LAMP + Webmin Quick Reference

## 🚀 Essential Commands

### System Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install security tools
sudo apt install -y fail2ban ufw clamav clamav-daemon
```

### Firewall Setup

```bash
# Configure UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 10000/tcp  # Webmin
sudo ufw --force enable
```

### ClamAV Setup

```bash
# Start ClamAV
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Update virus definitions
sudo freshclam

# Test ClamAV
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" > /tmp/test.txt
sudo clamscan /tmp/test.txt
rm /tmp/test.txt
```

### Directory Setup

```bash
# Create directories
sudo mkdir -p /var/www/uploads /tmp/erfa3ly-uploads /var/log/erfa3ly

# Set permissions
sudo chown www-data:www-data /var/www/uploads /tmp/erfa3ly-uploads /var/log/erfa3ly
sudo chmod 755 /var/www/uploads /tmp/erfa3ly-uploads /var/log/erfa3ly
```

### Node.js & PM2

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Start application
cd /var/www/erfa3ly
sudo pm2 start ecosystem.config.js
sudo pm2 save
sudo pm2 startup
```

### SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-apache

# Get certificate
sudo certbot --apache -d erfa3ly.com -d www.erfa3ly.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 🔧 Apache Configuration

### Virtual Host File

```apache
# /etc/apache2/sites-available/erfa3ly.conf
<VirtualHost *:80>
    ServerName erfa3ly.com
    ServerAlias www.erfa3ly.com
    DocumentRoot /var/www/erfa3ly

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"

    # Block upload directory
    <Directory /var/www/uploads>
        Order deny,allow
        Deny from all
    </Directory>

    # Proxy to Node.js
    <Location "/api/download-vps">
        ProxyPass http://localhost:3000
        ProxyPassReverse http://localhost:3000
    </Location>

    <Directory /var/www/erfa3ly>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### Enable Modules

```bash
sudo a2enmod headers proxy proxy_http
sudo a2ensite erfa3ly.conf
sudo systemctl reload apache2
```

## 📁 Environment Configuration

### .env.local

```bash
# VPS File Upload Configuration
UPLOAD_DIR=/var/www/uploads
TEMP_DIR=/tmp/erfa3ly-uploads
ENABLE_VIRUS_SCAN=true
CLAMAV_SOCKET=/var/run/clamav/clamd.ctl
ALLOW_ANONYMOUS_DOWNLOADS=true
MAX_FILE_SIZE=104857600
MAX_TOTAL_SIZE=1073741824
USE_RANDOM_FILENAMES=true
PRESERVE_FILE_EXTENSIONS=true
MONGODB_URI=mongodb://localhost:27017/erfa3ly
NEXTAUTH_URL=https://erfa3ly.com
NEXTAUTH_SECRET=your-secret-key-here
NODE_ENV=production
PORT=3000
```

## 🔍 Monitoring Commands

### Check Services

```bash
# Service status
sudo systemctl status apache2
sudo systemctl status clamav-daemon
sudo systemctl status fail2ban
sudo pm2 status

# Check logs
sudo tail -f /var/log/erfa3ly/upload-monitor.log
sudo tail -f /var/log/apache2/erfa3ly_error.log
```

### Disk & File Monitoring

```bash
# Check disk space
df -h /var/www/uploads

# Count files
find /var/www/uploads -type f | wc -l

# Check permissions
ls -la /var/www/uploads/
```

### Security Tests

```bash
# Test virus scanning
sudo clamscan /var/www/uploads/

# Test directory access
curl -I http://erfa3ly.com/var/www/uploads/

# Test application
curl -I https://erfa3ly.com/
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### Permission Denied

```bash
sudo chown -R www-data:www-data /var/www/uploads
sudo chmod -R 755 /var/www/uploads
```

#### ClamAV Not Working

```bash
sudo systemctl restart clamav-daemon
sudo freshclam
```

#### PM2 Not Starting

```bash
sudo pm2 delete erfa3ly
sudo pm2 start ecosystem.config.js
sudo pm2 save
```

#### Apache Errors

```bash
sudo apache2ctl configtest
sudo systemctl restart apache2
```

#### SSL Issues

```bash
sudo certbot renew --dry-run
sudo systemctl reload apache2
```

## 📊 Webmin Configuration

### Apache Configuration

1. **Servers** → **Apache Webserver**
2. **Global Configuration**
    - Document Root: `/var/www/erfa3ly`
    - Enable: mod_headers, mod_proxy, mod_proxy_http

### Virtual Host

1. **Create virtual host**
    - Server name: `erfa3ly.com`
    - Document root: `/var/www/erfa3ly`
    - Server aliases: `www.erfa3ly.com`

### File Manager

1. **Tools** → **File Manager**
2. Navigate to `/var/www/uploads`
3. Set permissions: **755** (dirs), **644** (files)
4. Set ownership: **www-data:www-data**

### System Monitoring

1. **System** → **System Statistics**
2. Enable: CPU, Memory, Disk, Network monitoring

## 🔄 Maintenance Commands

### Daily Tasks

```bash
# Update ClamAV definitions
sudo freshclam

# Check disk space
df -h

# Monitor logs
sudo tail -n 50 /var/log/erfa3ly/upload-monitor.log
```

### Weekly Tasks

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check SSL certificate
sudo certbot certificates

# Review fail2ban logs
sudo fail2ban-client status
```

### Monthly Tasks

```bash
# Full system backup
sudo tar -czf /var/backups/erfa3ly/full-backup-$(date +%Y%m%d).tar.gz /var/www/

# Security audit
sudo clamscan -r /var/www/uploads/
sudo find /var/www/uploads -type f -exec file {} \;
```

## 🚨 Emergency Commands

### Stop All Services

```bash
sudo systemctl stop apache2
sudo pm2 stop erfa3ly
sudo systemctl stop clamav-daemon
```

### Restart All Services

```bash
sudo systemctl restart apache2
sudo pm2 restart erfa3ly
sudo systemctl restart clamav-daemon
```

### Check System Health

```bash
# Check all services
sudo systemctl is-active apache2 clamav-daemon fail2ban

# Check disk space
df -h

# Check memory
free -h

# Check load
uptime
```

## 📞 Quick Contacts

-   **Webmin**: `https://your-server-ip:10000`
-   **Application**: `https://erfa3ly.com`
-   **Upload Directory**: `/var/www/uploads`
-   **Logs**: `/var/log/erfa3ly/`

## 🔐 Security Checklist

-   [ ] Firewall active (UFW)
-   [ ] Fail2ban running
-   [ ] ClamAV updated and running
-   [ ] SSL certificate valid
-   [ ] Upload directory secured
-   [ ] File permissions correct
-   [ ] Monitoring active
-   [ ] Backups working

---

**Last Updated**: [Date]
**Server IP**: [Your Server IP]
**Domain**: erfa3ly.com
