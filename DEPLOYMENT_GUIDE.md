# 🚀 Deployment Guide - 3D Model Viewer Pro

## Quick Deploy (5 Minutes)

### Option 1: GitHub Pages (Recommended)

```bash
# 1. Build for production
npm run build:production

# 2. Deploy to GitHub Pages
npm run deploy
```

Your site will be live at: `https://yourusername.github.io/repositoryname`

### Option 2: Netlify (Easiest)

1. Go to [netlify.com](https://netlify.com)
2. Drag the `dist/` folder to Netlify
3. Done! Your site is live

### Option 3: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 4: Custom Server

```bash
# Build
npm run build:production

# Upload contents of dist/ folder to your web server
# Make sure to serve index.html for all routes
```

## Pre-Deployment Testing

### 1. Build and Test Locally

```bash
# Production build
npm run build:production

# Test locally
npm run serve

# Open http://localhost:3000
```

### 2. Verify Core Features

- [ ] Homepage loads without errors
- [ ] Can load a 3D model (try sample models)
- [ ] Camera controls work (rotate, zoom, pan)
- [ ] Sidebar opens and closes
- [ ] Dark mode toggle works
- [ ] Mobile responsive (test on phone)

### 3. Test New UX Features

**Onboarding (First-Time Users):**
1. Clear browser localStorage: `localStorage.clear()`
2. Refresh page
3. Verify welcome tooltip appears
4. Load a model and verify next steps appear

**Mobile Gestures (On Touch Device):**
1. Pinch to zoom
2. Two-finger rotate
3. Swipe left/right to open/close sidebar
4. Long-press for context menu
5. Double-tap to reset camera

**Feature Discovery:**
1. Use the app normally
2. After loading 2-3 models, feature suggestions should appear
3. Verify suggestions are relevant and dismissible

## Environment Variables (Optional)

Create `.env` file for custom configuration:

```env
# Analytics (optional)
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Feature Flags (optional)
ENABLE_ONBOARDING=true
ENABLE_GESTURES=true
ENABLE_DISCOVERY=true

# API Keys (if using external services)
SKETCHFAB_API_KEY=your_key_here
```

## Performance Optimization

### Enable Compression

**Nginx:**
```nginx
gzip on;
gzip_types text/css application/javascript application/json;
gzip_min_length 1000;
```

**Apache (.htaccess):**
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/css application/javascript
</IfModule>
```

### Enable Caching

**Nginx:**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Apache (.htaccess):**
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

## CDN Setup (Optional)

For better global performance, use a CDN:

### Cloudflare (Free)
1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers
4. Enable "Auto Minify" for JS, CSS, HTML
5. Enable "Brotli" compression

### AWS CloudFront
```bash
# Create S3 bucket
aws s3 mb s3://your-bucket-name

# Upload dist folder
aws s3 sync dist/ s3://your-bucket-name

# Create CloudFront distribution
aws cloudfront create-distribution --origin-domain-name your-bucket-name.s3.amazonaws.com
```

## SSL/HTTPS Setup

### Free SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --webroot -w /var/www/html -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Cloudflare SSL (Easiest)
1. Add site to Cloudflare
2. SSL/TLS → Full (strict)
3. Done! Free SSL enabled

## Monitoring Setup

### Google Analytics

Add to `index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Error Tracking with Sentry

```bash
npm install @sentry/browser
```

Add to `src/main.js`:

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production"
});
```

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build:production
```

### CSS Not Loading

Check that CSS files are in `dist/` folder:
```bash
ls -la dist/*.css
ls -la dist/src/ui/*.css
```

### Features Not Working

1. Check browser console for errors
2. Verify all JS files loaded
3. Clear browser cache
4. Test in incognito mode

### Mobile Issues

1. Test on actual device (not just browser DevTools)
2. Check touch events are not blocked
3. Verify viewport meta tag is present
4. Test on multiple devices/browsers

## Post-Deployment Checklist

After deploying, verify:

- [ ] Site loads at your URL
- [ ] No 404 errors in console
- [ ] All CSS styles applied
- [ ] Can load and view 3D models
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Onboarding appears for new users
- [ ] Feature suggestions work
- [ ] Mobile gestures functional
- [ ] Performance is good (Lighthouse score >90)

## Rollback Procedure

If something goes wrong:

```bash
# Revert to previous commit
git revert HEAD

# Rebuild
npm run build:production

# Redeploy
npm run deploy
```

## Support & Updates

### Getting Help
- Check console for errors
- Review PRODUCTION_READY_CHECKLIST.md
- Check GitHub issues
- Review ENGINEERING_EXCELLENCE_PLAN.md

### Updating
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build:production

# Deploy
npm run deploy
```

## Success! 🎉

Your 3D Model Viewer Pro is now live with:
- ✅ Intelligent onboarding for new users
- ✅ Advanced mobile gesture controls
- ✅ Smart feature discovery
- ✅ Beautiful, accessible UI
- ✅ Production-grade performance

**Enjoy your world-class 3D model viewer!**

---

**Need Help?** Check the troubleshooting section or review the engineering documentation.
