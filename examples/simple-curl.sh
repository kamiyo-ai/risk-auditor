#!/bin/bash
# Risk Auditor API - Simple cURL Example with x402 Payment
#
# Prerequisites:
# 1. Solana CLI installed (https://docs.solana.com/cli/install-solana-cli-tools)
# 2. Funded Solana wallet

set -e

# Configuration
PAYMENT_WALLET="CE4BW1g1vuaS8hRQAGEABPi5PCuKBfJUporJxmdinCsY"
PAYMENT_AMOUNT="0.001"  # SOL
API_URL="https://risk-auditor.kamiyo.ai"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}KAMIYO Risk Auditor - API Test${NC}\n"

# Step 1: Create Solana payment
echo -e "${GREEN}Step 1: Creating Solana payment (${PAYMENT_AMOUNT} SOL)...${NC}"
SIGNATURE=$(solana transfer $PAYMENT_WALLET $PAYMENT_AMOUNT --output json-compact | jq -r '.signature')
echo "Payment signature: $SIGNATURE"

# Step 2: Create x402 payment header
echo -e "\n${GREEN}Step 2: Creating x402 payment header...${NC}"
LAMPORTS=$(echo "$PAYMENT_AMOUNT * 1000000000" | bc | cut -d'.' -f1)

PAYMENT_JSON=$(cat <<EOF
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "solana-mainnet",
  "payload": {
    "signature": "$SIGNATURE",
    "amount": "$LAMPORTS",
    "recipient": "$PAYMENT_WALLET"
  }
}
EOF
)

PAYMENT_HEADER=$(echo -n "$PAYMENT_JSON" | base64)
echo "X-PAYMENT header created"

# Step 3: Call approval-audit API
echo -e "\n${GREEN}Step 3: Calling /approval-audit API...${NC}"
WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"  # Vitalik's wallet
CHAINS="ethereum"

echo "Auditing wallet: $WALLET"
echo "Chains: $CHAINS"

curl -s "${API_URL}/approval-audit?wallet=${WALLET}&chains=${CHAINS}" \
  -H "X-PAYMENT: $PAYMENT_HEADER" \
  | jq '.'

echo -e "\n${GREEN}Done!${NC}"
echo "Note: You can reuse the same payment signature for 1 hour"
