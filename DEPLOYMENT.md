# Deployment Guide

## Quick Start

1. **Local Development**
   ```bash
   npm install
   npm start
   ```
   Open http://localhost:8080

2. **Production Build**
   ```bash
   npm run build
   ```

## Deployment Options

### 1. GitHub Pages
1. Push code to GitHub repository
2. Go to Settings > Pages
3. Select source branch (main/master)
4. Your site will be available at `https://username.github.io/repository-name`

### 2. Netlify
1. Connect your GitHub repository
2. Build command: `npm run build`
3. Publish directory: `./`
4. Deploy automatically on push

### 3. Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow prompts for deployment

### 4. AWS S3 + CloudFront
1. Create S3 bucket with static website hosting
2. Upload files to bucket
3. Create CloudFront distribution
4. Configure custom domain (optional)

### 5. Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase init hosting`
3. Run `firebase deploy`

## Environment Configuration

### Production Optimizations
- Enable gzip compression
- Set proper cache headers
- Use CDN for Three.js libraries
- Minify CSS/JS files

### Security Headers
Add these headers to your server configuration:
```
Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### HTTPS Requirements
- Required for PWA features
- Required for service worker
- Required for WebGL in some browsers

## Performance Monitoring

### Metrics to Track
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- WebGL performance
- Model loading times

### Tools
- Google PageSpeed Insights
- Lighthouse
- WebPageTest
- Chrome DevTools Performance tab

## Troubleshooting

### Common Issues
1. **CORS errors**: Ensure proper CORS headers for model files
2. **WebGL not supported**: Add fallback message
3. **Mobile performance**: Optimize for lower-end devices
4. **Large model files**: Implement progressive loading

### Browser Compatibility
- Chrome 51+
- Firefox 51+
- Safari 10+
- Edge 79+
- Mobile browsers with WebGL support