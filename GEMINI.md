# AgentPay tools

The `agentpay` MCP server provides paid tools. Listing them is free; each call costs a few tenths of a cent to two cents in USDC.

| Tool | Use it to | Price |
| --- | --- | --- |
| `extract_page` | Read a web page as clean markdown with title, metadata and links | $0.005 |
| `lookup_dns` | Resolve DNS records (A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, PTR, SRV) | $0.005 |
| `lookup_whois` | Get domain registration data (registrar, created/expires, status) | $0.01 |
| `lookup_ip` | Find who owns an IP address, its range, country and reverse DNS | $0.01 |
| `lookup_domain_report` | One-call domain overview: registration, DNS, email provider, SPF/DMARC, hosting | $0.02 |
| `tools_pdf_text` | Extract per-page text from a PDF URL | $0.01 |
| `tools_feed` | Parse an RSS/Atom/JSON feed into items | $0.005 |
| `tools_sitemap` | List a site's URLs from its sitemaps | $0.005 |

## Paying

- If a call returns a payment-required error, the user needs credits. They can buy a key with one x402 payment at
  `https://agentpay.agentpay-apis.workers.dev/credits/buy?usd=5` (USDC on Base or Algorand) and add the header
  `Authorization: Bearer <key>` to this server's settings.
- x402-capable clients can pay per call instead via `params._meta["x402/payment"]`.
- Invalid input is rejected before any charge, and failed calls are refunded.

Docs: https://github.com/noah-silver/agentpay
