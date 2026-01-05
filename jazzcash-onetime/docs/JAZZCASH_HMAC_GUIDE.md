# JazzCash HMAC-SHA256 Secure Hash Guide

Complete guide to JazzCash secure hash generation for MWALLET transactions.

---

## Overview

JazzCash requires **HMAC-SHA256** authentication for all API requests using a shared **Integrity Salt** (secret key). The hash is generated from all request parameters and must match exactly for the API call to succeed.

---

## STEP 1: Collect ALL `pp_` Fields (Except `pp_SecureHash`)

Include **every request parameter whose name starts with `pp`**:

### Required Fields

```
pp_Amount               # Amount in paisa (PKR * 100)
pp_BillReference        # Your order/transaction reference
pp_Description          # Transaction description
pp_Language             # EN
pp_MerchantID           # MYCONTENT5
pp_Password             # h2x1yxctww
pp_ReturnURL            # Callback URL
pp_TxnCurrency          # PKR
pp_TxnDateTime          # YYYYMMDDHHmmss
pp_TxnExpiryDateTime    # YYYYMMDDHHmmss (24 hrs later)
pp_TxnRefNo             # Unique transaction reference (e.g., T20251217123456)
pp_TxnType              # MWALLET
pp_Version              # 1.1
ppmpf_1                 # Customer mobile number
```

### Important Notes

- 🚫 **Do NOT include** `pp_SecureHash` itself in hash calculation
- ✅ **DO include** `ppmpf_1` (mobile number field)
- All fields are **required** - missing fields will cause hash mismatch

---

## STEP 2: Sort Fields Alphabetically (ASCII Order)

Sort **by parameter name**, not by value.

### Correct Alphabetical Order

```
pp_Amount
pp_BillReference
pp_Description
pp_Language
pp_MerchantID
pp_Password
pp_ReturnURL
pp_TxnCurrency
pp_TxnDateTime
pp_TxnExpiryDateTime
pp_TxnRefNo
pp_TxnType
pp_Version
ppmpf_1
```

📌 This order is **mandatory** and case-sensitive.

---

## STEP 3: Create the Concatenated Value String

### Rules

1. Take **ONLY the values** (not parameter names)
2. Join them using `&`
3. **NO spaces**
4. **NO parameter names**
5. Preserve exact value formats

### Example

Given these parameters:

```json
{
  "pp_Amount": "10000",
  "pp_BillReference": "JC-ORDER-123",
  "pp_Description": "MWallet One Time Payment",
  "pp_Language": "EN",
  "pp_MerchantID": "MYCONTENT5",
  "pp_Password": "h2x1yxctww",
  "pp_ReturnURL": "https://wallets.mycodigital.io/api/v1/jazzcash/callback",
  "pp_TxnCurrency": "PKR",
  "pp_TxnDateTime": "20251217123456",
  "pp_TxnExpiryDateTime": "20251218123456",
  "pp_TxnRefNo": "T20251217123456",
  "pp_TxnType": "MWALLET",
  "pp_Version": "1.1",
  "ppmpf_1": "03123456789"
}
```

Concatenated string:

```
10000&JC-ORDER-123&MWallet One Time Payment&EN&MYCONTENT5&h2x1yxctww&https://wallets.mycodigital.io/api/v1/jazzcash/callback&PKR&20251217123456&20251218123456&T20251217123456&MWALLET&1.1&03123456789
```

---

## STEP 4: Prepend Integrity Salt

Add your **Integrity Salt + `&`** at the **start** of the string:

```
440982v92s&10000&JC-ORDER-123&MWallet One Time Payment&EN&MYCONTENT5&h2x1yxctww&https://wallets.mycodigital.io/api/v1/jazzcash/callback&PKR&20251217123456&20251218123456&T20251217123456&MWALLET&1.1&03123456789
```

📌 This **exact string** is what gets hashed.

---

## STEP 5: Apply HMAC-SHA256

### Algorithm Details

- **Algorithm:** HMAC-SHA256
- **Key:** Integrity Salt (`440982v92s`)
- **Message:** Full string from Step 4
- **Encoding:** UTF-8
- **Output:** Lowercase Hexadecimal (64 characters)

### Node.js Implementation

```javascript
const crypto = require('crypto');

const integritySalt = '440982v92s';
const stringToHash = '440982v92s&10000&JC-ORDER-123&...';

const secureHash = crypto
  .createHmac('sha256', integritySalt)
  .update(stringToHash, 'utf8')
  .digest('hex')
  .toLowerCase();

console.log(secureHash);
// Output: 2371a60a70425455619f82bd0a7dc0dfb0a96d568467a64d310a049dab9e2cfa
```

---

## STEP 6: Add to Request

Include the generated hash in your request:

```json
{
  "pp_Amount": "10000",
  "pp_BillReference": "JC-ORDER-123",
  "pp_Description": "MWallet One Time Payment",
  "pp_Language": "EN",
  "pp_MerchantID": "MYCONTENT5",
  "pp_Password": "h2x1yxctww",
  "pp_ReturnURL": "https://wallets.mycodigital.io/api/v1/jazzcash/callback",
  "pp_TxnCurrency": "PKR",
  "pp_TxnDateTime": "20251217123456",
  "pp_TxnExpiryDateTime": "20251218123456",
  "pp_TxnRefNo": "T20251217123456",
  "pp_TxnType": "MWALLET",
  "pp_Version": "1.1",
  "ppmpf_1": "03123456789",
  "pp_SecureHash": "2371a60a70425455619f82bd0a7dc0dfb0a96d568467a64d310a049dab9e2cfa"
}
```

---

## Common Mistakes (VERY IMPORTANT)

### ❌ Hash Mismatch Errors

Any of these will cause authentication failure:

1. **Including `pp_SecureHash` in hash calculation**
2. **Sorting by value instead of by parameter name**
3. **Missing `ppmpf_1` field**
4. **Extra spaces or line breaks in concatenated string**
5. **Wrong ReturnURL (trailing slash, http vs https)**
6. **Uppercase hex output** (must be lowercase)
7. **Wrong amount format** (must be in paisa, not PKR)
8. **Incorrect date-time format** (must be YYYYMMDDHHmmss)

### ✅ Debugging Tips

If hash doesn't match:

1. Log the exact concatenated string before hashing
2. Verify alphabetical order of parameter names
3. Check for extra spaces or special characters
4. Ensure integrity salt is correct
5. Verify all parameter values are strings
6. Check date-time format (no dashes, colons, or spaces)

---

## Amount Conversion

JazzCash expects amounts in **paisa** (smallest currency unit).

### Conversion Formula

```
paisa = PKR × 100
```

### Examples

| PKR Amount | Paisa Amount | String Value |
|------------|--------------|--------------|
| 1.00 PKR   | 100 paisa    | "100"        |
| 10.00 PKR  | 1000 paisa   | "1000"       |
| 100.00 PKR | 10000 paisa  | "10000"      |
| 999.99 PKR | 99999 paisa  | "99999"      |

### Implementation

```javascript
const amountPKR = 100.00;
const amountPaisa = Math.round(amountPKR * 100);
const pp_Amount = String(amountPaisa); // "10000"
```

---

## Date-Time Format

JazzCash requires **YYYYMMDDHHmmss** format (14 digits, no separators).

### Format

```
YYYY - 4 digit year
MM   - 2 digit month (01-12)
DD   - 2 digit day (01-31)
HH   - 2 digit hour (00-23)
mm   - 2 digit minute (00-59)
ss   - 2 digit second (00-59)
```

### Examples

| Date/Time               | JazzCash Format |
|-------------------------|-----------------|
| 2025-12-17 12:34:56    | 20251217123456  |
| 2025-01-01 00:00:00    | 20250101000000  |
| 2025-12-31 23:59:59    | 20251231235959  |

### Implementation

```javascript
function generateDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Transaction DateTime (now)
const pp_TxnDateTime = generateDateTime();

// Expiry DateTime (24 hours later)
const expiryDate = new Date();
expiryDate.setHours(expiryDate.getHours() + 24);
const pp_TxnExpiryDateTime = generateDateTime(expiryDate);
```

---

## Complete Implementation Example

### Full Request Builder

```javascript
const crypto = require('crypto');

class JazzCashHashGenerator {
  constructor(integritySalt) {
    this.integritySalt = integritySalt;
  }

  generateDateTime(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  buildRequest({ orderId, amount, mobile, merchantId, password, returnUrl }) {
    const amountPaisa = Math.round(amount * 100);
    const txnDateTime = this.generateDateTime();
    
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    const txnExpiryDateTime = this.generateDateTime(expiryDate);

    const params = {
      pp_Amount: String(amountPaisa),
      pp_BillReference: orderId,
      pp_Description: 'MWallet One Time Payment',
      pp_Language: 'EN',
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_ReturnURL: returnUrl,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: txnDateTime,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_TxnRefNo: `T${txnDateTime}`,
      pp_TxnType: 'MWALLET',
      pp_Version: '1.1',
      ppmpf_1: mobile,
    };

    // Generate secure hash
    const secureHash = this.generateSecureHash(params);
    params.pp_SecureHash = secureHash;

    return params;
  }

  generateSecureHash(params) {
    // Step 1 & 2: Get all pp_ fields and sort alphabetically
    const ppFields = Object.keys(params)
      .filter(key => key.startsWith('pp'))
      .sort();

    // Step 3: Join values with &
    const valueString = ppFields.map(key => params[key]).join('&');

    // Step 4: Prepend integrity salt + &
    const stringToHash = `${this.integritySalt}&${valueString}`;

    // Step 5 & 6: HMAC-SHA256 with lowercase hex output
    const hash = crypto
      .createHmac('sha256', this.integritySalt)
      .update(stringToHash, 'utf8')
      .digest('hex')
      .toLowerCase();

    return hash;
  }
}

// Usage
const hashGenerator = new JazzCashHashGenerator('440982v92s');

const request = hashGenerator.buildRequest({
  orderId: 'JC-ORDER-123',
  amount: 100.00,
  mobile: '03123456789',
  merchantId: 'MYCONTENT5',
  password: 'h2x1yxctww',
  returnUrl: 'https://wallets.mycodigital.io/api/v1/jazzcash/callback',
});

console.log(request);
```

---

## Testing the Hash

### Postman Pre-request Script

```javascript
// JazzCash HMAC-SHA256 Hash Generator
const integritySalt = pm.environment.get('INTEGRITY_SALT');
const merchantId = pm.environment.get('MERCHANT_ID');
const password = pm.environment.get('PASSWORD');
const returnUrl = pm.environment.get('RETURN_URL');

// Generate timestamps
const now = new Date();
const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

const txnDateTime = formatDateTime(now);
const txnExpiryDateTime = formatDateTime(expiry);

// Build params
const params = {
  pp_Amount: '10000', // 100 PKR
  pp_BillReference: 'JC-TEST-' + Date.now(),
  pp_Description: 'MWallet One Time Payment Test',
  pp_Language: 'EN',
  pp_MerchantID: merchantId,
  pp_Password: password,
  pp_ReturnURL: returnUrl,
  pp_TxnCurrency: 'PKR',
  pp_TxnDateTime: txnDateTime,
  pp_TxnExpiryDateTime: txnExpiryDateTime,
  pp_TxnRefNo: 'T' + txnDateTime,
  pp_TxnType: 'MWALLET',
  pp_Version: '1.1',
  ppmpf_1: '03123456789',
};

// Generate hash
const ppFields = Object.keys(params).filter(k => k.startsWith('pp')).sort();
const valueString = ppFields.map(k => params[k]).join('&');
const stringToHash = integritySalt + '&' + valueString;

const secureHash = CryptoJS.HmacSHA256(stringToHash, integritySalt).toString(CryptoJS.enc.Hex);

// Set request body
pm.request.body.raw = JSON.stringify({
  ...params,
  pp_SecureHash: secureHash
});
```

---

## Response Codes

### Success Codes

| Code | Meaning |
|------|---------|
| 000  | Success - Transaction approved |

### Common Error Codes

| Code | Meaning |
|------|---------|
| 124  | Duplicate transaction |
| 157  | Invalid hash |
| 158  | Merchant not found |
| 159  | Invalid credentials |
| 167  | Transaction expired |

---

## Production Credentials

```
Merchant ID:     MYCONTENT5
Password:        h2x1yxctww
Integrity Salt:  440982v92s
```

⚠️ **Security Note:** Store these in environment variables, never in code!

---

## Support

For JazzCash API issues:
- Technical Support: jazzcash-support@jazzcash.com.pk
- Documentation: [JazzCash Merchant Portal](https://payments.jazzcash.com.pk)

For MyPay integration issues:
- Technical Support: tech@myco.io

---

**Last Updated:** December 17, 2025

