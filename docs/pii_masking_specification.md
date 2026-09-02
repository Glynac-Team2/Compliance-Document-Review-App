# PII Masking Specification

## 1. Overview & Objectives
- **Purpose:** Server-side deterministic sanitization of sensitive client data before any payload leaves application boundaries to external LLM and embedding APIs.
- **Security Policy:** Raw PII is strictly forbidden from network transmission. All transformations happen in volatile application memory prior to egress.

## 2. Token Definitions
| Entity Type | Placeholder Token | Description |
| :--- | :--- | :--- |
| Email | `[EMAIL_N]` | Personal and corporate email addresses |
| Phone Number | `[PHONE_N]` | Domestic and international formatted numbers |
| Account / SSN | `[ACCOUNT_N]` | SSNs, TINs, and brokerage account IDs |
| Monetary Amount | `[AMOUNT_N]` | Specific dollar figures tied to individuals |
| Physical Address | `[ADDRESS_N]` | Street, unit, city, and postal code strings |
| Client Name | `[CLIENT_N]` | Full names and personal identity references |

## 3. Pattern Logic & Regex Rules

### 3.1 Email
- **Pattern:** `\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b`
- **Sample Match:** `john.doe@springer.com` -> `[EMAIL_1]`

### 3.2 Phone Number
- **Pattern:** `(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b`
- **Sample Match:** `(555) 234-5678` -> `[PHONE_1]`

### 3.3 Account & SSN Identifiers
- **Pattern:** `\b(?:\d{3}-\d{2}-\d{4}|(?:ACCT|ACC|ACT|NO\.?|#)\s*[:#-]?\s*\d{6,12})\b`
- **Sample Match:** `123-45-6789` -> `[ACCOUNT_1]`, `ACCT# 987654321` -> `[ACCOUNT_2]`

### 3.4 Person-Tied Dollar Amounts
- **Pattern:** `(?<=\b(?:balance|portfolio|worth|invested|assets|deposited|withdrew|has|holds|owns|value of)\s{1,5})\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b|\b\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b(?=\s{1,5}(?:in (?:his|her|their) account|from (?:his|her|their) portfolio))`
- **Sample Match:** `balance $50,000.00` -> `balance [AMOUNT_1]`

### 3.5 Physical Address
- **Pattern / Heuristic:** `\b\d{1,5}\s+[A-Za-z0-9\.\s]{2,25}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Suite|Ste|Apt|Apartment|Unit)\b(?:,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?`
- **Sample Match:** `742 Evergreen Terrace, Springfield, OR 97477` -> `[ADDRESS_1]`

### 3.6 Client Name
- **Pattern / Heuristic:** `(?<=\b(?:Client|Advisor|Investor|Mr\.|Ms\.|Mrs\.|Dr\.|Dear)\s+)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+`
- **Sample Match:** `Client John Doe` -> `Client [CLIENT_1]`

## 4. State Management & Bidirectional Mapping

### 4.1 Lookup Dictionary Lifecycle
- During document upload, the server instantiates an isolated in-memory mapping table:
```json
{
  "masked_text": "Please review the portfolio for [CLIENT_1] with balance [AMOUNT_1].",
  "pii_map": {
    "[CLIENT_1]": "John Doe",
    "[AMOUNT_1]": "$50,000"
  }
}
```
- **Outbound Flow:** Raw Document -> Regex Sanitization Engine -> `masked_text` generated -> Sent to external LLM API.
- **Inbound Flow:** LLM Flag/Summary Response -> Backend String Replacement via `pii_map` lookup -> Cleaned UI render for compliance officers.
- **Security Boundary:** The `pii_map` dictionary remains strictly in local memory and is purged once the review session completes.

## 5. Known Limitations & Failure Modes

1. **Unconventional Names:** Regex heuristics rely heavily on prefixes (e.g., `Mr.`, `Client`) and Title Case; lowercased names or uncommon naming formats without contextual prefixes can escape detection.
2. **Ambiguous Numeric Literals:** Benchmark metrics (e.g., "$10,000 minimum investment fund") risk false-positive masking if adjacent text mirrors individual account balances.
3. **Fragmented Addresses:** Informal address mentions lacking standard street/unit suffixes (e.g., "sent to his flat in Mumbai") will not trigger structured regex matches.
4. **Regex Execution Order:** Replacements must be executed in order of highest specificity (SSN/Account -> Address -> Phone -> Email -> Dollar Amount -> Name) to avoid partial token overwriting.
