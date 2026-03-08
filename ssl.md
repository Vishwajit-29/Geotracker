# 🔒 SSL Setup Guide — GeoTracker

> **One-time setup** after first deploy. Once SSL is configured, future deploys will preserve it automatically.

## Why SSL Breaks — Root Cause

The Build & Deploy pipeline writes an HTTP-only Nginx config on **first deploy**. If you set up SSL manually and then re-deploy, the pipeline **used to overwrite** your SSL config back to HTTP-only.

**Fix:** The pipeline now checks if SSL is already configured and **skips the config overwrite** if SSL cert paths are found.

---

## Prerequisites

- ✅ Build & Deploy pipeline ran successfully (app running on EC2)
- ✅ Domain A record pointing to EC2 IP (`vishwajit.tech` or subdomain like `attendance.vishwajit.tech`)
- ✅ Ports **80** and **443** open in AWS Security Group

---

## Step 1 — Verify DNS Points to EC2

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

curl -s ifconfig.me

nslookup vishwajit.tech 8.8.8.8
```

> ⚠️ Both must match. If not, update A records in your domain provider and wait 2-5 minutes.

## Step 2 — Get SSL Certificate

```bash
sudo certbot --nginx -d vishwajit.tech
```

> For subdomain use: `sudo certbot --nginx -d attendance.vishwajit.tech`

If Certbot says "Could not find matching server block", write the SSL config manually (Step 2b).

### Step 2b — Manual SSL Config (only if certbot fails to auto-install)

```bash
sudo tee /etc/nginx/sites-available/geotracker > /dev/null << 'EOF'
server {
    listen 80;
    server_name vishwajit.tech www.vishwajit.tech;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name vishwajit.tech www.vishwajit.tech;
    ssl_certificate /etc/letsencrypt/live/vishwajit.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vishwajit.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/geotracker /etc/nginx/sites-enabled/geotracker
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

> If using subdomain, replace all `vishwajit.tech` with `attendance.vishwajit.tech` in the above config.

## Step 3 — Auto-Renew SSL

```bash
echo "0 0,12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | sudo tee /etc/cron.d/certbot-renew
```

## Step 4 — Verify

Visit `https://vishwajit.tech` — green padlock 🔒

---

## ⚠️ Important Notes

| Topic                  | Detail                                                                        |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Future deploys**     | Pipeline skips Nginx config if SSL is already set up — **SSL will not break** |
| **New EC2 instance**   | If Terraform creates a new EC2, repeat all steps (new IP = new cert needed)   |
| **Cert expiry**        | Auto-renews every 90 days via cron (Step 3)                                   |
| **AWS Security Group** | Ports 80 and 443 must be open                                                 |
| **DNS records**        | A record must point to EC2 IP                                                 |

---

## Troubleshooting

| Problem                                | Fix                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Certbot: "no valid A records"          | DNS not pointing to EC2 — update and wait                                  |
| Certbot: "Could not find server block" | Use Step 2b (manual config)                                                |
| SSL breaks after deploy                | Pipeline should skip overwrite — check if `pipeline.yml` has the SSL check |
| Site unreachable after deploy          | SSH in, check `docker ps` and `sudo systemctl status nginx`                |
| "Not secure" warning                   | SSL config was overwritten — re-run Step 2b                                |
