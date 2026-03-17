## SSL / HTTPS for `sarasotaautomotive.com`

This guide explains how to issue and install a free **Let’s Encrypt** SSL certificate on the VPS running Nginx, and how to verify auto‑renewal.

Assumptions:
- VPS OS: Ubuntu (e.g. 22.04)
- App already running via Nginx reverse proxy on port `80` → `http://localhost:3000`
- Domain: `sarasotaautomotive.com` pointing to this VPS

---

## 1. DNS prerequisites

- In your DNS manager (Hostinger / GoDaddy), create **A records**:
  - `sarasotaautomotive.com` → VPS IP
  - `www.sarasotaautomotive.com` → VPS IP (optional but recommended)
- Wait a few minutes, then from your local machine:

```bash
ping sarasotaautomotive.com
```

If the IP matches your VPS, you are ready.

---

## 2. SSH into the VPS

From your local terminal:

```bash
ssh root@187.124.225.101
```

Replace the IP if the server changes.

---

## 3. Ensure Nginx server_name matches the domain

Certbot’s Nginx installer needs a `server` block whose `server_name` matches the domain.

Edit the site config:

```bash
nano /etc/nginx/sites-available/sarasota-automotive.conf
```

Make sure the HTTP server block looks like this (key part is `server_name`):

```nginx
server {
    listen 80;
    server_name sarasotaautomotive.com www.sarasotaautomotive.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    client_max_body_size 50M;
}
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Test and reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

If there are errors, fix them before continuing.

---

## 4. Install Certbot (Let’s Encrypt client)

On the VPS:

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
```

---

## 5. Obtain and install the certificate

Use the Nginx plugin so Certbot edits the Nginx config automatically:

```bash
certbot --nginx -d sarasotaautomotive.com -d www.sarasotaautomotive.com
```

During the prompts:

- Enter an email address (for expiry notices)
- Accept the terms of service
- **Choose the option that redirects HTTP → HTTPS** when asked

If you ever see a message like:

> The certificate was saved, but could not be installed (installer: nginx)  
> Could not automatically find a matching server block for sarasotaautomotive.com.

it means `server_name` was not set correctly in Nginx. Fix the config as in step 3 and then run:

```bash
certbot install --cert-name sarasotaautomotive.com
```

Finally, test and reload:

```bash
nginx -t
systemctl reload nginx
```

Now you should be able to visit:

- `https://sarasotaautomotive.com/`
- `https://www.sarasotaautomotive.com/`

and see the site with a valid HTTPS padlock.

---

## 6. Check and test auto‑renewal

Certbot normally configures automatic renewal using a **systemd timer**.

### 6.1. Check the timer

```bash
systemctl status certbot.timer
```

You should see something like `active (waiting)` with a “Next run” time.

Alternatively:

```bash
systemctl list-timers | grep certbot
```

If the timer is present and active, renewal is scheduled.

### 6.2. Dry‑run a renewal (recommended)

Run:

```bash
certbot renew --dry-run
```

If you see messages ending with **“Congratulations, all renewals succeeded”**, then auto‑renewal is working.

If there are errors, fix them and re‑run the command. Common issues:

- Nginx config errors (run `nginx -t`)
- DNS for the domain was changed or is pointing elsewhere

---

## 7. Useful troubleshooting commands

- View Certbot logs:

```bash
less /var/log/letsencrypt/letsencrypt.log
```

- Show current certificate details:

```bash
openssl x509 -in /etc/letsencrypt/live/sarasotaautomotive.com/fullchain.pem -noout -text | less
```

- Force reload Nginx after config or cert changes:

```bash
nginx -t
systemctl reload nginx
```

