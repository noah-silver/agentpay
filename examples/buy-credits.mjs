// Example agent client: prepay credits, get an API key, make a call with it.
//   node examples/buy-credits.mjs https://<host> 0.10      (prompts for the phrase, hidden)
// Sends <usd> USDC to the service wallet with a hashed-secret note, then redeems it.
import algosdk from 'algosdk';
import { createHash, randomBytes } from 'node:crypto';
import readline from 'node:readline';

// Accept phrases copied with capitals, commas, numbering ("1. word") or line breaks.
function loadAccount(raw) {
  const words = raw.toLowerCase().replace(/\d+[.)]/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length !== 25) {
    console.error(
      `Recovery phrase has ${words.length} words; Algorand wallet phrases have 25.` +
        (words.length === 12 || words.length === 24 ? ' A 12/24-word phrase is from a different wallet type (e.g. a multi-chain or Ledger wallet), not a standard Algorand account.' : ''),
    );
    process.exit(1);
  }
  try {
    return algosdk.mnemonicToSecretKey(words.join(' '));
  } catch (e) {
    console.error(`Recovery phrase rejected: ${e.message}. Check for a misspelled word.`);
    process.exit(1);
  }
}

// Hidden prompt that keeps reading lines until it has 25 words (or a blank line).
function promptPhrase() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write('Recovery phrase (hidden; paste it, then press Enter): ');
    rl._writeToOutput = () => {};
    let text = '';
    rl.on('close', () => resolve(text));
    rl.on('line', (line) => {
      text += ' ' + line;
      const n = text.toLowerCase().replace(/\d+[.)]/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).length;
      if (n >= 25 || !line.trim()) {
        rl.close();
        process.stdout.write('\n');
        resolve(text);
      }
    });
  });
}

const [base, usd = '0.10'] = process.argv.slice(2);
if (!base) {
  console.error('usage: node examples/buy-credits.mjs <service url> [usd]');
  process.exit(1);
}
const account = loadAccount(process.env.ALGO_MNEMONIC || (await promptPhrase()));
console.log('paying from', account.addr.toString());
const algod = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', '');

const { payTo, asset } = await (await fetch(`${base}/.well-known/x402`)).json();
const secret = randomBytes(24).toString('hex');
const note = `agentpay:${createHash('sha256').update(secret).digest('hex')}`;

const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
  sender: account.addr,
  receiver: payTo,
  assetIndex: Number(asset),
  amount: BigInt(Math.round(Number(usd) * 1e6)),
  note: new TextEncoder().encode(note),
  suggestedParams: await algod.getTransactionParams().do(),
});
let txid;
try {
  ({ txid } = await algod.sendRawTransaction(txn.signTxn(account.sk)).do());
} catch (e) {
  const m = String(e?.message ?? e);
  console.error(
    /overspend/.test(m) ? `Not enough funds in ${account.addr}: it needs ${usd} USDC plus ~0.001 ALGO for the network fee (and its ALGO minimum balance).`
    : /asset .* missing|not opted/i.test(m) ? `${account.addr} has not opted in to USDC.`
    : `Payment rejected by the network: ${m.slice(0, 300)}`,
  );
  process.exit(1);
}
await algosdk.waitForConfirmation(algod, txid, 6);
console.log('paid', usd, 'USDC, txid', txid);

let key;
for (let i = 0; i < 10 && !key; i++) {
  const r = await fetch(`${base}/credits/redeem`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txid, secret }) });
  const j = await r.json();
  if (r.ok) key = j.apiKey;
  else if (/not found yet/.test(j.error)) await new Promise((s) => setTimeout(s, 2000));
  else throw new Error(j.error);
}
console.log('API key (save it):', key);

const r = await fetch(`${base}/lookup/v1/dns?name=example.com`, { headers: { authorization: `Bearer ${key}` } });
console.log(r.status, 'credits remaining:', r.headers.get('x-credits-remaining'));
console.log(await r.text());
