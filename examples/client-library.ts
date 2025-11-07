/**
 * Risk Auditor TypeScript Client Library
 *
 * Easy-to-use client for the KAMIYO Risk Auditor API with built-in x402 payment support
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

export interface RiskAuditorConfig {
  apiUrl?: string;
  solanaRpcUrl?: string;
  paymentWallet?: string;
  pricePerRequest?: number;
}

export interface ApprovalAuditRequest {
  wallet: string;
  chains?: string[];
}

export interface TokenApproval {
  token_address: string;
  token_symbol: string;
  token_name: string;
  spender_address: string;
  spender_name?: string;
  allowance: string;
  is_unlimited: boolean;
  last_updated: string;
  transaction_hash: string;
}

export interface RiskFlag {
  type: 'unlimited' | 'stale' | 'exploited_protocol' | 'suspicious_spender';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface RevocationTransaction {
  to: string;
  data: string;
  value: string;
  chainId: number;
  token_address: string;
  spender_address: string;
  description: string;
}

export interface ApprovalAuditResponse {
  success: boolean;
  wallet: string;
  chains: string[];
  approvals: TokenApproval[];
  risk_flags: Record<string, RiskFlag[]>;
  revoke_tx_data: RevocationTransaction[];
  total_approvals: number;
  risky_approvals: number;
  timestamp: string;
}

export class RiskAuditorClient {
  private config: Required<RiskAuditorConfig>;
  private connection: Connection;
  private payer: Keypair;
  private paymentCache: Map<string, { signature: string; timestamp: number }>;

  constructor(payer: Keypair, config: RiskAuditorConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://risk-auditor.kamiyo.ai',
      solanaRpcUrl: config.solanaRpcUrl || 'https://api.mainnet-beta.solana.com',
      paymentWallet: config.paymentWallet || 'CE4BW1g1vuaS8hRQAGEABPi5PCuKBfJUporJxmdinCsY',
      pricePerRequest: config.pricePerRequest || 0.001,
    };
    this.payer = payer;
    this.connection = new Connection(this.config.solanaRpcUrl, 'confirmed');
    this.paymentCache = new Map();
  }

  /**
   * Create a payment transaction for x402
   */
  private async createPayment(): Promise<string> {
    // Check if we have a recent cached payment (within 1 hour)
    const now = Date.now();
    for (const [sig, data] of this.paymentCache.entries()) {
      if (now - data.timestamp < 3600000) { // 1 hour
        console.log('Using cached payment signature:', sig);
        return sig;
      }
    }

    const recipient = new PublicKey(this.config.paymentWallet);
    const lamports = this.config.pricePerRequest * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.payer.publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    console.log(`Sending ${this.config.pricePerRequest} SOL payment...`);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.payer]
    );

    // Cache the payment
    this.paymentCache.set(signature, { signature, timestamp: now });
    console.log('Payment successful:', signature);

    return signature;
  }

  /**
   * Create x402 payment header
   */
  private async createX402Header(): Promise<string> {
    const signature = await this.createPayment();
    const lamports = this.config.pricePerRequest * LAMPORTS_PER_SOL;

    const payment = {
      x402Version: 1,
      scheme: 'exact',
      network: 'solana-mainnet',
      payload: {
        signature,
        amount: lamports.toString(),
        recipient: this.config.paymentWallet,
      },
    };

    return Buffer.from(JSON.stringify(payment)).toString('base64');
  }

  /**
   * Audit wallet token approvals
   */
  async auditApprovals(request: ApprovalAuditRequest): Promise<ApprovalAuditResponse> {
    const paymentHeader = await this.createX402Header();

    const params = new URLSearchParams({
      wallet: request.wallet,
      ...(request.chains && { chains: request.chains.join(',') }),
    });

    const url = `${this.config.apiUrl}/approval-audit?${params}`;
    console.log('Calling:', url);

    const response = await fetch(url, {
      headers: {
        'X-PAYMENT': paymentHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get exploit data for a protocol
   */
  async getExploits(protocol?: string, chain?: string, limit?: number): Promise<any> {
    const paymentHeader = await this.createX402Header();

    const params = new URLSearchParams({
      ...(protocol && { protocol }),
      ...(chain && { chain }),
      ...(limit && { limit: limit.toString() }),
    });

    const url = `${this.config.apiUrl}/exploits?${params}`;
    const response = await fetch(url, {
      headers: {
        'X-PAYMENT': paymentHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get risk score for a protocol
   */
  async getRiskScore(protocol: string, chain?: string): Promise<any> {
    const paymentHeader = await this.createX402Header();

    const params = new URLSearchParams({
      ...(chain && { chain }),
    });

    const url = `${this.config.apiUrl}/risk-score/${protocol}${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: {
        'X-PAYMENT': paymentHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check service health
   */
  async health(): Promise<any> {
    const url = `${this.config.apiUrl}/health`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Example usage
async function example() {
  // Load your Solana keypair (never commit this!)
  // const payer = Keypair.fromSecretKey(Uint8Array.from([...]));

  // For demo, generate a new keypair (fund it with SOL first)
  const payer = Keypair.generate();
  console.log('Payer address:', payer.publicKey.toString());
  console.log('Fund this wallet with SOL before using');

  const client = new RiskAuditorClient(payer);

  // Check health
  const health = await client.health();
  console.log('Service health:', health);

  // Audit Vitalik's wallet
  const audit = await client.auditApprovals({
    wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chains: ['ethereum', 'polygon'],
  });

  console.log(`Found ${audit.total_approvals} approvals`);
  console.log(`Risky approvals: ${audit.risky_approvals}`);

  // Print risk flags
  for (const [key, flags] of Object.entries(audit.risk_flags)) {
    console.log(`\nRisks for ${key}:`);
    for (const flag of flags) {
      console.log(`  - [${flag.severity}] ${flag.type}: ${flag.description}`);
    }
  }

  // Print revocation transactions
  console.log(`\nRevocation transactions (${audit.revoke_tx_data.length}):`);
  for (const tx of audit.revoke_tx_data) {
    console.log(`  - ${tx.description}`);
    console.log(`    To: ${tx.to}`);
    console.log(`    Data: ${tx.data.substring(0, 20)}...`);
  }
}

// Run example if executed directly
if (require.main === module) {
  example().catch(console.error);
}

export default RiskAuditorClient;
