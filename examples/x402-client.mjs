// Example agent client using the official x402 libraries: pays per call on Base or Algorand.
//   EVM_PRIVATE_KEY=0x... node examples/x402-client.mjs "https://<host>/lookup/v1/dns?name=example.com"
//   ALGO_MNEMONIC="25 words" node examples/x402-client.mjs "https://<host>/lookup/v1/dns?name=example.com"
// The paying wallet needs USDC on that network (and a little ALGO for fees on Algorand).
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';
import { toClientAvmSigner } from '@x402/avm';
import { ExactAvmScheme } from '@x402/avm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';
import algosdk from 'algosdk';

const url = process.argv[2];
const schemes = [];
if (process.env.EVM_PRIVATE_KEY) {
  schemes.push({ network: 'eip155:8453', client: new ExactEvmScheme(privateKeyToAccount(process.env.EVM_PRIVATE_KEY)) });
}
if (process.env.ALGO_MNEMONIC) {
  const { sk } = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC.trim().toLowerCase().split(/\s+/).join(' '));
  schemes.push({ network: 'algorand:*', client: new ExactAvmScheme(toClientAvmSigner(Buffer.from(sk).toString('base64'))) });
}
if (!url || !schemes.length) {
  console.error('usage: EVM_PRIVATE_KEY=0x... | ALGO_MNEMONIC="..." node examples/x402-client.mjs <url>');
  process.exit(1);
}

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, { schemes });
const res = await fetchWithPayment(url);
const receipt = res.headers.get('payment-response');
console.log(res.status, receipt ? JSON.parse(Buffer.from(receipt, 'base64').toString()) : '');
console.log((await res.text()).slice(0, 2000));
