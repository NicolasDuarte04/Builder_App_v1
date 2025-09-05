# Auto | CO Smoke Tests

cURL examples

```bash
# a) Baseline list (expect ~20)
curl -sS "http://localhost:3000/api/plans_v2/search?category=auto&country=CO&limit=25" | jq '.'

# b) Provider filter (AXA Colpatria)
curl -sS "http://localhost:3000/api/plans_v2/search?category=auto&country=CO&provider=AXA%20Colpatria&limit=25" | jq '.'

# c) Price window 10k–1.2M COP
curl -sS "http://localhost:3000/api/plans_v2/search?category=auto&country=CO&minPrice=10000&maxPrice=1200000&limit=25" | jq '.'
```

Sample (first 5)

```json
{
  "ids": ["<id1>", "<id2>", "<id3>", "<id4>", "<id5>"],
  "providers": ["<prov1>", "<prov2>", "<prov3>", "<prov4>", "<prov5>"],
  "prices": ["<p1>", "<p2>", "<p3>", "<p4>", "<p5>"]
}
```

Notes: replace placeholders from data/audit/postcommit_auto_CO_sample.csv when running locally.
