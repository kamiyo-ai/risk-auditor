# Deployment Guide - Risk Auditor

## Quick Deploy to Render.com

1. **Connect Repository**
   - Go to [Render.com](https://render.com)
   - Create new Web Service
   - Connect to GitHub repository: `kamiyo-ai/risk-auditor`
   - Render will auto-detect `render.yaml`

2. **Set Environment Variables**
   Required variables (add in Render dashboard):
   ```
   ETHERSCAN_API_KEY=<your_etherscan_key>
   POLYGONSCAN_API_KEY=<your_polygonscan_key>
   BSCSCAN_API_KEY=<your_bscscan_key>
   ARBISCAN_API_KEY=<your_arbiscan_key>
   OPTIMISTIC_ETHERSCAN_API_KEY=<your_optimistic_key>
   BASESCAN_API_KEY=<your_basescan_key>
   SNOWTRACE_API_KEY=<your_snowtrace_key>
   ```

3. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Custom domain: Add `risk-auditor.kamiyo.ai` in settings

## Docker Deployment

```bash
# Build
docker build -t risk-auditor .

# Run
docker run -p 3000:3000 \
  -e PAYMENT_WALLET=CE4BW1g1vuaS8hRQAGEABPi5PCuKBfJUporJxmdinCsY \
  -e ETHERSCAN_API_KEY=your_key \
  -e POLYGONSCAN_API_KEY=your_key \
  risk-auditor
```

## Verification

After deployment, verify endpoints:

```bash
# Health check
curl https://risk-auditor.kamiyo.ai/health

# Should return version 3.0.0 with approval_auditing: true
```

## Production Checklist

- [ ] Version 3.0.0 deployed
- [ ] /approval-audit endpoint accessible
- [ ] /health shows `approval_auditing: true`
- [ ] All blockchain explorer API keys configured
- [ ] Custom domain configured
- [ ] HTTPS enabled
