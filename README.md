# AgentPay — pay-per-call APIs and MCP tools for AI agents

Web extraction, domain/network intelligence, and document tools that agents can use **without signing up**.
Pay per request with [x402](https://x402.org) in USDC on **Base** or **Algorand**, or prepay credits for an API key.
Every product is available as a REST API and as a remote **MCP server**.

| Product | What it does | Base URL | MCP server |
| --- | --- | --- | --- |
| **Web Extract** | Any URL → clean, LLM-ready markdown + title, metadata, Open Graph, canonical URL and links | `https://agentpay-extract.agentpay-apis.workers.dev` | `…/mcp` |
| **Domain & Network Lookup** | DNS records, WHOIS/RDAP registration, IP ownership + reverse DNS, one-call domain report (email provider, SPF/DMARC, hosting) | `https://agentpay-lookup.agentpay-apis.workers.dev` | `…/mcp` |
| **Doc Tools** | PDF → per-page text, RSS/Atom/JSON Feed → JSON, sitemap (via robots.txt) → URL list | `https://agentpay-tools.agentpay-apis.workers.dev` | `…/mcp` |
| **Bundle** | All of the above on one host | `https://agentpay.agentpay-apis.workers.dev` | `…/mcp` |

Machine-readable docs: [`/llms.txt`](https://agentpay.agentpay-apis.workers.dev/llms.txt) ·
[`/openapi.json`](https://agentpay.agentpay-apis.workers.dev/openapi.json) ·
[`/.well-known/x402`](https://agentpay.agentpay-apis.workers.dev/.well-known/x402)

## Endpoints and pricing

Same price on Base and Algorand. Invalid input is rejected **before** payment, and x402 payments are only
settled if the call succeeds — failed calls cost nothing.

| Endpoint | Description | Price (USDC) |
| --- | --- | --- |
| `GET /extract/v1/page?url=` | Web page → markdown, metadata, links (`maxChars` optional) | $0.005 |
| `GET /lookup/v1/dns?name=&type=` | A, AAAA, CNAME, MX, NS, TXT, SOA, CAA, PTR, SRV | $0.005 |
| `GET /lookup/v1/whois?domain=` | Registrar, created/updated/expires, status, nameservers (RDAP) | $0.01 |
| `GET /lookup/v1/ip?ip=` | Network owner, range, country, reverse DNS | $0.01 |
| `GET /lookup/v1/domain-report?domain=` | Registration + DNS + email provider + SPF/DMARC + hosting | $0.02 |
| `GET /tools/v1/pdf-text?url=` | Per-page text from a PDF URL (≤20 MB) | $0.01 |
| `GET /tools/v1/feed?url=&limit=` | RSS / Atom / JSON Feed → normalized items | $0.005 |
| `GET /tools/v1/sitemap?url=&limit=` | Site URLs from sitemaps, following robots.txt and indexes | $0.005 |
| `GET /credits/buy?usd=` | Prepaid credits ($1–$500) → API key. **+10% bonus at $5, +20% at $20** | = amount |

## Paying

### Free trial

`GET https://agentpay.agentpay-apis.workers.dev/credits/trial` returns an API key with $0.05 of free credit (one per network per day).
Use it as `Authorization: Bearer <key>` on any endpoint or MCP server.

### Pay by hand with Pera Wallet

Open **https://agentpay.agentpay-apis.workers.dev/pay**, connect Pera, pick an endpoint (or buy credits), and approve the
USDC payment in the app. Network fees are sponsored, so only USDC is needed.

### x402 (no account)

Call any endpoint. You get `402 Payment Required` with a base64 `PAYMENT-REQUIRED` header (x402 v2) offering:

- **Base** — `eip155:8453`, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, exact scheme (EIP-3009)
- **Algorand** — `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`, USDC ASA `31566704`, exact scheme, network fees sponsored by the GoPlausible facilitator (`extra.feePayer`)

Any x402 v2 client handles this automatically:

```js
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: 'eip155:8453', client: new ExactEvmScheme(privateKeyToAccount(process.env.EVM_PRIVATE_KEY)) }],
});
const res = await fetchWithPayment('https://agentpay-lookup.agentpay-apis.workers.dev/lookup/v1/domain-report?domain=example.com');
console.log(await res.json());
```

Full example for both networks: [`examples/x402-client.mjs`](examples/x402-client.mjs).

### Prepaid credits (fastest for repeated use)

`GET https://agentpay.agentpay-apis.workers.dev/credits/buy?usd=5` (paid once via x402) returns `{ "apiKey": "ak_…" }`.
Send `Authorization: Bearer ak_…` on any endpoint or MCP server. Failed calls are refunded automatically.
Balance: `GET /credits/balance`. Algorand holders can also pay by transfer: [`examples/buy-credits.mjs`](examples/buy-credits.mjs).

## Using the MCP servers

Remote MCP over Streamable HTTP. Listing tools is free; tool calls are paid via x402
(`params._meta["x402/payment"]`, per the x402 MCP transport) or with a credits key header.

**Claude Code**

```bash
claude mcp add --transport http agentpay-lookup https://agentpay-lookup.agentpay-apis.workers.dev/mcp --header "Authorization: Bearer ak_..."
```

**Cursor / Claude Desktop / any client with remote MCP support**

```json
{
  "mcpServers": {
    "agentpay-extract": { "url": "https://agentpay-extract.agentpay-apis.workers.dev/mcp", "headers": { "Authorization": "Bearer ak_..." } },
    "agentpay-lookup":  { "url": "https://agentpay-lookup.agentpay-apis.workers.dev/mcp",  "headers": { "Authorization": "Bearer ak_..." } },
    "agentpay-tools":   { "url": "https://agentpay-tools.agentpay-apis.workers.dev/mcp",   "headers": { "Authorization": "Bearer ak_..." } }
  }
}
```

| MCP server | Tools |
| --- | --- |
| agentpay-extract | `extract_page` |
| agentpay-lookup | `lookup_dns`, `lookup_whois`, `lookup_ip`, `lookup_domain_report` |
| agentpay-tools | `tools_pdf_text`, `tools_feed`, `tools_sitemap` |
| agentpay (bundle) | all 8 |

## Example responses

`GET /lookup/v1/whois?domain=anthropic.com`

```json
{ "domain": "anthropic.com", "registered": true, "registrar": "MarkMonitor Inc.", "created": "2001-10-02T18:10:32Z",
  "expires": "2033-10-02T18:10:32Z", "status": ["client delete prohibited", "client transfer prohibited"],
  "nameservers": ["isla.ns.cloudflare.com", "randy.ns.cloudflare.com"], "source": "RDAP" }
```

`GET /lookup/v1/ip?ip=1.1.1.1`

```json
{ "ip": "1.1.1.1", "version": 4, "reverseDns": ["one.one.one.one."],
  "network": { "name": "APNIC-LABS", "range": "1.1.1.0 - 1.1.1.255", "country": "AU", "organization": "APNIC Research and Development" } }
```

## Data sources

DNS over HTTPS (Cloudflare 1.1.1.1), IANA RDAP bootstrap → authoritative registry RDAP servers, and the
regional internet registries. Web, PDF, feed and sitemap tools fetch the URL you provide at request time.

## Support

Open an issue in this repository.
