# Deployment Guide

## Automated Deployment System

The 3D Model Viewer Pro uses GitHub Actions for automated deployment to GitHub Pages. The system includes build optimization, testing, deployment verification, and status notifications.

## Deployment Workflows

### 1. Main Deployment (`deploy.yml`)

**Triggers:**
- Push to `main` or `master` branch
- Pull requests (build only, no deployment)

**Process:**
1. **Build Job:**
   - Checkout code
   - Setup Node.js 18
   - Install dependencies with `npm ci`
   - Run tests with `npm test`
   - Build production bundle with `npm run build:production`
   - Verify build output
   - Upload build artifacts

2. **Deploy Job:**
   - Deploy to GitHub Pages
   - Verify deployment success
   - Perform basic health check

3. **Notify Job:**
   - Send deployment status notifications
   - Report success or failure

### 2. Post-Deployment Verification (`deployment-check.yml`)

**Triggers:**
- Completion of main deployment workflow

**Checks:**
- Site accessibility at https://modelviewer.wecanuseai.com
- Critical resource availability (JS, CSS, manifest)
- Basic performance metrics
- Response time validation

### 3. Status Notifications (`deployment-status.yml`)

**Features:**
- Generates deployment reports
- Creates GitHub issues for failures
- Automatically closes issues on success
- Provides troubleshooting guidance

## Build Optimization Features

### Code Splitting
- **Entry Points:** Main app, cinematic engine, physics engine, XR manager
- **Vendor Splitting:** Separate chunks for Three.js and other dependencies
- **Dynamic Imports:** Lazy loading of optional modules

### Asset Optimization
- **File Hashing:** Content-based hashing for cache busting
- **Minification:** HTML, CSS, and JavaScript minification
- **Compression:** Automatic asset compression in production
- **Bundle Analysis:** Optional bundle size analysis

### Performance Features
- **Tree Shaking:** Remove unused code
- **Module Federation:** Efficient module loading
- **Cache Optimization:** Long-term caching strategies
- **Source Maps:** Production source maps for debugging

## Manual Deployment

### Local Build and Deploy
```bash
# Build for production
npm run build:production

# Analyze bundle (optional)
npm run build:analyze

# Deploy to GitHub Pages (requires gh-pages CLI)
npm run deploy
```

### Development Server
```bash
# Start development server with hot reload
npm run start:dev

# Build and serve locally
npm start
```

## Configuration

### Domain Configuration
The site is configured to deploy to `modelviewer.wecanuseai.com` via the `CNAME` file.

### GitHub Pages Settings
- **Source:** GitHub Actions
- **Custom Domain:** modelviewer.wecanuseai.com
- **HTTPS:** Enforced

### Environment Variables
No environment variables are required for basic deployment. Optional configurations:
- `ANALYZE=true`: Enable bundle analysis during build

## Troubleshooting

### Common Issues

#### 1. Build Failures
**Symptoms:** Red X on GitHub Actions, build job fails
**Solutions:**
- Check for syntax errors in code
- Verify all dependencies are installed
- Run `npm test` locally to catch test failures
- Check webpack configuration for errors

#### 2. Deployment Failures
**Symptoms:** Build succeeds but deployment fails
**Solutions:**
- Verify GitHub Pages is enabled
- Check repository permissions
- Ensure CNAME file is present and correct
- Verify GitHub Actions has Pages write permissions

#### 3. Site Not Accessible
**Symptoms:** Deployment succeeds but site returns 404
**Solutions:**
- Wait 5-10 minutes for DNS propagation
- Check CNAME configuration
- Verify index.html is in dist/ directory
- Check GitHub Pages settings

#### 4. Missing Assets
**Symptoms:** Site loads but resources are missing
**Solutions:**
- Verify webpack copy plugin configuration
- Check that all assets are in dist/ directory
- Ensure relative paths are used for assets
- Check browser console for 404 errors

#### 5. Performance Issues
**Symptoms:** Slow loading times
**Solutions:**
- Run bundle analysis: `npm run build:analyze`
- Check for large dependencies
- Verify code splitting is working
- Enable compression in hosting

### Debug Commands

```bash
# Check build output
ls -la dist/

# Verify required files
test -f dist/index.html && echo "✓ HTML" || echo "✗ HTML missing"
test -f dist/bundle.js && echo "✓ JS" || echo "✗ JS missing"
test -f dist/CNAME && echo "✓ CNAME" || echo "✗ CNAME missing"

# Test local build
npm run build:production
npm run serve

# Analyze bundle size
npm run build:analyze
```

### Monitoring

#### Automated Checks
- Site accessibility verification
- Resource availability checks
- Performance monitoring
- Error tracking via GitHub Issues

#### Manual Verification
1. Visit https://modelviewer.wecanuseai.com
2. Check browser console for errors
3. Test model loading functionality
4. Verify all features work correctly
5. Test on different devices/browsers

## Security Considerations

### Content Security Policy
- Strict CSP headers in production
- Whitelisted domains for external resources
- No inline scripts (except where required by Three.js)

### Asset Integrity
- Content hashing for cache busting
- Subresource integrity for external resources
- Secure HTTPS-only deployment

### Access Control
- GitHub Actions permissions limited to necessary scopes
- No sensitive data in public repository
- Environment variables for sensitive configuration

## Performance Monitoring

### Metrics Tracked
- Bundle size and composition
- Load times and Core Web Vitals
- Error rates and types
- User engagement metrics

### Optimization Strategies
- Code splitting by feature
- Lazy loading of optional modules
- Asset compression and caching
- Progressive enhancement

## Maintenance

### Regular Tasks
- Monitor deployment success rates
- Review bundle size reports
- Update dependencies regularly
- Test deployment process

### Updates and Releases
1. Create feature branch
2. Implement changes
3. Test locally
4. Create pull request
5. Review automated checks
6. Merge to main for deployment
7. Verify deployment success
8. Monitor for issues

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review this troubleshooting guide
3. Create GitHub issue with deployment-failure label
4. Include relevant logs and error messages