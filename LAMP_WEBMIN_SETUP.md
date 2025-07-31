# LAMP Stack + Webmin Setup for Secure File Uploads

## Pre-Setup Checklist

### ✅ System Requirements

-   [ ] Ubuntu/Debian or CentOS/RHEL server
-   [ ] Webmin installed and accessible
-   [ ] LAMP stack (Linux, Apache, MySQL, PHP) configured
-   [ ] SSH access with sudo privileges
-   [ ] Domain name pointing to server

## Step 1: Server Security Hardening

### ✅ Update System Packages

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### ✅ Install Essential Security Tools

```bash
# Ubuntu/Debian
sudo apt install -y fail2ban ufw clamav clamav-daemon

# CentOS/RHEL
sudo yum install -y fail2ban firewalld clamav clamav-update
```

### ✅ Configure Firewall

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 10000/tcp  # Webmin port
sudo ufw --force enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=10000/tcp  # Webmin port
sudo firewall-cmd --reload
```

### ✅ Configure Fail2ban

```bash
# Create fail2ban configuration
sudo nano /etc/fail2ban/jail.local
```

Add this content:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[apache-auth]
enabled = true
port = http,https
filter = apache-auth
logpath = /var/log/apache2/error.log
maxretry = 3

[webmin-auth]
enabled = true
port = 10000
filter = webmin-auth
logpath = /var/webmin/miniserv.log
maxretry = 3
```

```bash
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

## Step 2: Install and Configure ClamAV

### ✅ Install ClamAV

```bash
# Ubuntu/Debian
sudo apt install -y clamav clamav-daemon

# CentOS/RHEL
sudo yum install -y clamav clamav-update
```

### ✅ Configure ClamAV

```bash
# Start and enable ClamAV daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Update virus definitions
sudo freshclam

# Test ClamAV
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" | sudo tee /tmp/eicar.txt
sudo clamscan /tmp/eicar.txt
sudo rm /tmp/eicar.txt
```

## Step 3: Create Secure Upload Directory Structure

### ✅ Create Upload Directories

```bash
# Create main upload directory outside web root
sudo mkdir -p /var/www/uploads
sudo mkdir -p /tmp/erfa3ly-uploads
sudo mkdir -p /var/log/erfa3ly

# Set proper ownership and permissions
sudo chown www-data:www-data /var/www/uploads
sudo chown www-data:www-data /tmp/erfa3ly-uploads
sudo chown www-data:www-data /var/log/erfa3ly

sudo chmod 755 /var/www/uploads
sudo chmod 755 /tmp/erfa3ly-uploads
sudo chmod 755 /var/log/erfa3ly
```

### ✅ Configure Apache Virtual Host

```bash
# Create Apache configuration
sudo nano /etc/apache2/sites-available/erfa3ly.conf
```

Add this content:

```apache
<VirtualHost *:80>
    ServerName erfa3ly.com
    ServerAlias www.erfa3ly.com
    DocumentRoot /var/www/erfa3ly

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer-when-downgrade"
    Header always set Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'"

    # Block direct access to upload directory
    <Directory /var/www/uploads>
        Order deny,allow
        Deny from all
    </Directory>

    # Handle file downloads through secure endpoint
    <Location "/api/download-vps">
        ProxyPass http://localhost:3000
        ProxyPassReverse http://localhost:3000
    </Location>

    # Main application directory
    <Directory /var/www/erfa3ly>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/erfa3ly_error.log
    CustomLog ${APACHE_LOG_DIR}/erfa3ly_access.log combined

    # Enable mod_headers
    LoadModule headers_module modules/mod_headers.so
</VirtualHost>
```

```bash
# Enable the site
sudo a2ensite erfa3ly.conf
sudo a2enmod headers
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl reload apache2
```

## Step 4: Webmin Configuration

### ✅ Access Webmin

1. Open browser and go to `https://your-server-ip:10000`
2. Login with your Webmin credentials

### ✅ Configure Apache in Webmin

1. Go to **Servers** → **Apache Webserver**
2. Click on **Global Configuration**
3. Set **Document Root** to `/var/www/erfa3ly`
4. Enable **mod_headers**, **mod_proxy**, **mod_proxy_http**
5. Click **Save**

### ✅ Configure Virtual Host in Webmin

1. Go to **Servers** → **Apache Webserver**
2. Click **Create virtual host**
3. Set **Server name** to `erfa3ly.com`
4. Set **Document root** to `/var/www/erfa3ly`
5. Add **Server aliases**: `www.erfa3ly.com`
6. Click **Create**

### ✅ Configure File Manager in Webmin

1. Go to **Tools** → **File Manager**
2. Navigate to `/var/www/uploads`
3. Set permissions to **755** for directories
4. Set permissions to **644** for files
5. Set ownership to **www-data:www-data**

## Step 5: Install Node.js and PM2

### ✅ Install Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### ✅ Install PM2

```bash
sudo npm install -g pm2
```

### ✅ Create PM2 Ecosystem File

```bash
sudo nano /var/www/erfa3ly/ecosystem.config.js
```

Add this content:

```javascript
module.exports = {
    apps: [
        {
            name: "erfa3ly",
            script: "npm",
            args: "start",
            cwd: "/var/www/erfa3ly",
            user: "www-data",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
            },
        },
    ],
};
```

## Step 6: Deploy Your Application

### ✅ Copy Application Files

```bash
# Copy your application to the server
sudo cp -r /path/to/your/app/* /var/www/erfa3ly/

# Set proper ownership
sudo chown -R www-data:www-data /var/www/erfa3ly
```

### ✅ Install Dependencies

```bash
cd /var/www/erfa3ly
sudo npm install
```

### ✅ Create Environment File

```bash
sudo nano /var/www/erfa3ly/.env.local
```

Add this content:

```bash
# VPS File Upload Configuration
UPLOAD_DIR=/var/www/uploads
TEMP_DIR=/tmp/erfa3ly-uploads

# Virus Scanning
ENABLE_VIRUS_SCAN=true
CLAMAV_SOCKET=/var/run/clamav/clamd.ctl

# Access Control
ALLOW_ANONYMOUS_DOWNLOADS=true

# File Size Limits (in bytes)
MAX_FILE_SIZE=104857600
MAX_TOTAL_SIZE=1073741824

# Security Settings
USE_RANDOM_FILENAMES=true
PRESERVE_FILE_EXTENSIONS=true

# Database
MONGODB_URI=mongodb://localhost:27017/erfa3ly

# NextAuth
NEXTAUTH_URL=https://erfa3ly.com
NEXTAUTH_SECRET=your-secret-key-here

# Application
NODE_ENV=production
PORT=3000
```

### ✅ Build and Start Application

```bash
cd /var/www/erfa3ly
sudo npm run build
sudo pm2 start ecosystem.config.js
sudo pm2 save
sudo pm2 startup
```

## Step 7: Configure SSL (Let's Encrypt)

### ✅ Install Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-apache

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-apache
```

### ✅ Obtain SSL Certificate

```bash
sudo certbot --apache -d erfa3ly.com -d www.erfa3ly.com
```

### ✅ Set up Auto-renewal

```bash
sudo crontab -e
```

Add this line:

```
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 8: Create Monitoring Scripts

### ✅ Create Upload Monitor Script

```bash
sudo nano /usr/local/bin/monitor-uploads.sh
```

Add this content:

```bash
#!/bin/bash

UPLOAD_DIR="/var/www/uploads"
LOG_FILE="/var/log/erfa3ly/upload-monitor.log"

echo "$(date): Checking upload directory..." >> $LOG_FILE

# Check disk usage
DISK_USAGE=$(df -h $UPLOAD_DIR | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): WARNING - Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Count files
FILE_COUNT=$(find $UPLOAD_DIR -type f | wc -l)
echo "$(date): Total files in upload directory: $FILE_COUNT" >> $LOG_FILE

# Check ClamAV status
if systemctl is-active --quiet clamav-daemon; then
    echo "$(date): ClamAV daemon is running" >> $LOG_FILE
else
    echo "$(date): ERROR - ClamAV daemon is not running" >> $LOG_FILE
fi

# Check PM2 status
if pm2 list | grep -q "erfa3ly.*online"; then
    echo "$(date): PM2 application is running" >> $LOG_FILE
else
    echo "$(date): ERROR - PM2 application is not running" >> $LOG_FILE
fi
```

```bash
sudo chmod +x /usr/local/bin/monitor-uploads.sh
```

### ✅ Create Backup Script

```bash
sudo nano /usr/local/bin/backup-uploads.sh
```

Add this content:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/erfa3ly"
UPLOAD_DIR="/var/www/uploads"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $UPLOAD_DIR .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "Backup completed: uploads_$DATE.tar.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-uploads.sh
```

### ✅ Set up Cron Jobs

```bash
sudo crontab -e
```

Add these lines:

```
# Monitor uploads every 15 minutes
*/15 * * * * /usr/local/bin/monitor-uploads.sh

# Backup uploads daily at 2 AM
0 2 * * * /usr/local/bin/backup-uploads.sh

# Update ClamAV definitions daily
0 3 * * * /usr/bin/freshclam
```

## Step 9: Final Security Checks

### ✅ Test Security Features

```bash
# Test virus scanning
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" > /tmp/test.txt
sudo clamscan /tmp/test.txt
rm /tmp/test.txt

# Test file upload directory access
curl -I http://erfa3ly.com/var/www/uploads/
# Should return 403 Forbidden

# Test application
curl -I http://erfa3ly.com/
# Should return 200 OK
```

### ✅ Verify Services

```bash
# Check service status
sudo systemctl status apache2
sudo systemctl status clamav-daemon
sudo systemctl status fail2ban
sudo pm2 status
```

## Step 10: Webmin Final Configuration

### ✅ Configure System Monitoring

1. Go to **System** → **System Statistics**
2. Enable monitoring for:
    - CPU usage
    - Memory usage
    - Disk space
    - Network traffic

### ✅ Set up Log Monitoring

1. Go to **Tools** → **Log File Rotation**
2. Add log files:
    - `/var/log/erfa3ly/upload-monitor.log`
    - `/var/log/apache2/erfa3ly_error.log`
    - `/var/log/apache2/erfa3ly_access.log`

### ✅ Configure Backup

1. Go to **Backup Configuration Files**
2. Add backup for:
    - `/var/www/uploads/`
    - `/var/www/erfa3ly/`
    - `/etc/apache2/sites-available/`

## Post-Setup Verification

### ✅ Security Checklist

-   [ ] Firewall is active and configured
-   [ ] Fail2ban is running and configured
-   [ ] ClamAV is running and updated
-   [ ] SSL certificate is valid and auto-renewing
-   [ ] Upload directory is outside web root
-   [ ] File permissions are correct
-   [ ] Monitoring scripts are running
-   [ ] Backup system is working
-   [ ] Application is accessible via HTTPS

### ✅ Performance Checklist

-   [ ] Apache is configured with security headers
-   [ ] PM2 is managing the Node.js application
-   [ ] Log rotation is configured
-   [ ] Disk space monitoring is active
-   [ ] SSL certificate is properly configured

### ✅ Maintenance Checklist

-   [ ] Set up regular security updates
-   [ ] Configure log monitoring
-   [ ] Set up backup verification
-   [ ] Plan for disaster recovery
-   [ ] Document all configurations

## Troubleshooting

### Common Issues:

1. **Permission Denied**: Check file ownership and permissions
2. **ClamAV not working**: Restart daemon and update definitions
3. **PM2 not starting**: Check Node.js installation and ecosystem config
4. **SSL issues**: Verify domain DNS and certificate renewal
5. **Upload failures**: Check disk space and directory permissions

### Useful Commands:

```bash
# Check service status
sudo systemctl status [service-name]

# View logs
sudo tail -f /var/log/erfa3ly/upload-monitor.log
sudo tail -f /var/log/apache2/erfa3ly_error.log

# Restart services
sudo systemctl restart apache2
sudo systemctl restart clamav-daemon
sudo pm2 restart erfa3ly

# Check disk space
df -h /var/www/uploads

# Check file permissions
ls -la /var/www/uploads/
```

This setup provides enterprise-level security for your file upload system while maintaining the ease of use that Webmin provides for server management.
