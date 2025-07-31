# Security Checklist for VPS File Uploads

## Pre-Deployment Security

### ✅ Server Hardening

-   [ ] Update all system packages
-   [ ] Install and configure firewall (UFW or firewalld)
-   [ ] Disable unnecessary services
-   [ ] Configure SSH with key-based authentication only
-   [ ] Set up fail2ban for SSH protection
-   [ ] Install and configure ClamAV antivirus
-   [ ] Set up automatic security updates

### ✅ File System Security

-   [ ] Create upload directory outside web root (`/var/www/uploads`)
-   [ ] Set proper file permissions (755 for directories, 644 for files)
-   [ ] Configure ownership (www-data:www-data)
-   [ ] Enable disk space monitoring
-   [ ] Set up file system quotas if needed

### ✅ Network Security

-   [ ] Configure Nginx with security headers
-   [ ] Block direct access to upload directory
-   [ ] Enable HTTPS with valid SSL certificates
-   [ ] Configure rate limiting at Nginx level
-   [ ] Set up proper proxy headers

## Application Security

### ✅ File Upload Security

-   [ ] Implement file type validation (MIME types + extensions)
-   [ ] Add file signature validation (magic numbers)
-   [ ] Set file size limits (individual and daily quotas)
-   [ ] Enable virus scanning with ClamAV
-   [ ] Sanitize filenames and prevent path traversal
-   [ ] Generate secure random filenames
-   [ ] Store files with proper permissions

### ✅ Access Control

-   [ ] Implement user authentication
-   [ ] Add rate limiting per user/IP
-   [ ] Configure download access control
-   [ ] Log all upload/download activities
-   [ ] Implement session management
-   [ ] Add CSRF protection

### ✅ Input Validation

-   [ ] Validate all file uploads
-   [ ] Sanitize user inputs
-   [ ] Prevent SQL injection
-   [ ] Implement proper error handling
-   [ ] Add request size limits

## Runtime Security

### ✅ Monitoring and Logging

-   [ ] Set up application logging
-   [ ] Monitor file upload activities
-   [ ] Track disk space usage
-   [ ] Monitor ClamAV status
-   [ ] Set up alerting for security events
-   [ ] Log failed upload attempts

### ✅ Backup and Recovery

-   [ ] Implement regular file backups
-   [ ] Set up database backups
-   [ ] Test backup restoration
-   [ ] Store backups off-site
-   [ ] Implement file integrity checks

### ✅ Performance and Maintenance

-   [ ] Monitor application performance
-   [ ] Set up automatic restarts
-   [ ] Implement file cleanup policies
-   [ ] Monitor memory and CPU usage
-   [ ] Set up health checks

## Security Testing

### ✅ Vulnerability Assessment

-   [ ] Test file upload with malicious files
-   [ ] Verify virus scanning works
-   [ ] Test rate limiting functionality
-   [ ] Check for path traversal vulnerabilities
-   [ ] Test authentication bypass attempts
-   [ ] Verify proper error handling

### ✅ Penetration Testing

-   [ ] Test file type bypass attempts
-   [ ] Verify access control enforcement
-   [ ] Test for privilege escalation
-   [ ] Check for information disclosure
-   [ ] Test denial of service protection

## Ongoing Security

### ✅ Regular Maintenance

-   [ ] Update ClamAV virus definitions daily
-   [ ] Review and rotate logs weekly
-   [ ] Update system packages monthly
-   [ ] Review access logs monthly
-   [ ] Test backup restoration quarterly
-   [ ] Update SSL certificates before expiry

### ✅ Security Monitoring

-   [ ] Monitor for unusual upload patterns
-   [ ] Check for failed authentication attempts
-   [ ] Monitor disk space usage
-   [ ] Track virus detection events
-   [ ] Monitor rate limit violations

## Emergency Response

### ✅ Incident Response Plan

-   [ ] Document security incident procedures
-   [ ] Set up emergency contact list
-   [ ] Prepare system isolation procedures
-   [ ] Document evidence preservation steps
-   [ ] Plan for service restoration

### ✅ Recovery Procedures

-   [ ] Document system recovery steps
-   [ ] Test disaster recovery procedures
-   [ ] Maintain offline backups
-   [ ] Document rollback procedures

## Compliance and Legal

### ✅ Data Protection

-   [ ] Implement data retention policies
-   [ ] Ensure GDPR compliance (if applicable)
-   [ ] Document data processing activities
-   [ ] Implement user data deletion procedures

### ✅ Legal Requirements

-   [ ] Review terms of service
-   [ ] Implement DMCA compliance procedures
-   [ ] Document copyright violation handling
-   [ ] Set up abuse reporting system

## Security Tools and Scripts

### ✅ Automated Security

-   [ ] Set up automated virus definition updates
-   [ ] Implement automated backup scripts
-   [ ] Configure automated monitoring alerts
-   [ ] Set up automated log rotation
-   [ ] Implement automated security scans

### ✅ Security Scripts

-   [ ] Monitor upload directory script
-   [ ] Backup uploads script
-   [ ] ClamAV status check script
-   [ ] Disk space monitoring script
-   [ ] Security log analysis script

## Documentation

### ✅ Security Documentation

-   [ ] Document security configuration
-   [ ] Maintain incident response procedures
-   [ ] Document backup and recovery procedures
-   [ ] Keep security contact information updated
-   [ ] Document system architecture

### ✅ User Documentation

-   [ ] Document file upload restrictions
-   [ ] Provide security guidelines for users
-   [ ] Document privacy policy
-   [ ] Maintain terms of service

## Checklist Usage

1. **Before Deployment**: Complete all Pre-Deployment and Application Security items
2. **After Deployment**: Complete all Runtime Security and Security Testing items
3. **Ongoing**: Review and update Ongoing Security items regularly
4. **Monthly**: Review entire checklist and update as needed
5. **Quarterly**: Perform comprehensive security audit

## Security Metrics to Track

-   Number of virus detections per month
-   Failed upload attempts per day
-   Rate limit violations per hour
-   Disk space usage trends
-   Authentication failures per day
-   Backup success rate
-   System uptime percentage

## Emergency Contacts

-   System Administrator: [Contact Info]
-   Security Team: [Contact Info]
-   Hosting Provider: [Contact Info]
-   Legal Team: [Contact Info]

---

**Last Updated**: [Date]
**Next Review**: [Date]
**Reviewed By**: [Name]
