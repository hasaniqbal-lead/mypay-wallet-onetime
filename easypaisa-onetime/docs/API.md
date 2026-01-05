# MyPay Wallets API - Merchant Documentation

Production API for Easypaisa wallet payments.

---

## Base URL

### Production
```
http://wallets.mycodigital.io:8888/api/v1
```

### Local Development
```
http://localhost:4003/api/v1
```

---

## Authentication

All requests require an API key in the header:

```http
X-Api-Key: your-api-key-here
```

Contact support to get your API key.

---

## Endpoints

### 1. Easypaisa MA Charge

Initiate an Easypaisa Mobile Account charge.

**Endpoint:** `POST /easypaisa/charge`

**Request:**

```http
POST /api/v1/easypaisa/charge HTTP/1.1
Host: wallets.mycodigital.io:8888
X-Api-Key: your-api-key
Content-Type: application/json

{
  "orderId": "ORDER-12345",
  "amount": 100.00,
  "mobile": "03097524704"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | string | Yes | Your unique order reference |
| amount | number | Yes | Amount in PKR (must be > 0) |
| mobile | string | Yes | Customer's Easypaisa number (03XXXXXXXXX) |

**Response (Success - Approved):**

```json
{
  "success": true,
  "orderId": "ORDER-12345",
  "status": "APPROVED",
  "provider": "easypaisa",
  "channel": "MA",
  "amount": 100.0,
  "currency": "PKR",
  "meta": {
    "easypayStatus": "PAID",
    "easypayResponseCode": "0000",
    "easypayTransactionId": "EP123456789",
    "paymentToken": "TOKEN-xyz",
    "paymentTokenExpiryDateTime": "2025-12-31T12:00:00Z"
  }
}
```

**Response (Pending):**

```json
{
  "success": true,
  "orderId": "ORDER-12345",
  "status": "PENDING",
  "provider": "easypaisa",
  "channel": "MA",
  "amount": 100.0,
  "currency": "PKR",
  "meta": {
    "easypayStatus": "PENDING",
    "easypayResponseCode": "0000"
  }
}
```

**Response (Failed):**

```json
{
  "success": false,
  "orderId": "ORDER-12345",
  "status": "FAILED",
  "errorCode": "EASYPAY_0020",
  "errorMessage": "Insufficient balance",
  "meta": {
    "easypayResponseCode": "0020",
    "easypayResponseDesc": "Insufficient balance"
  }
}
```

---

## Status Codes

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Transaction approved (PAID) |
| 202 | Transaction pending (customer needs to confirm) |
| 400 | Bad request or transaction failed |
| 401 | Invalid API key |
| 500 | Internal server error |

---

## Transaction Statuses

| Status | Description |
|--------|-------------|
| APPROVED | Payment completed successfully |
| PENDING | Waiting for customer confirmation |
| FAILED | Payment failed |

---

## Error Codes

Common Easypaisa error codes:

| Code | Description |
|------|-------------|
| 0000 | Success |
| 0001 | Success (alternate) |
| 0012 | Invalid order ID |
| 0015 | Duplicate order ID |
| 0020 | Insufficient balance |
| 0030 | Invalid mobile number |

---

## Idempotency

The API is idempotent for the same `orderId`. If you submit the same order ID multiple times, you will receive the same transaction result.

This prevents accidental duplicate charges.

---

## Testing

Use our Postman collection for easy testing:
- [Download Collection](../tests/postman/MyPay_Wallets_API.postman_collection.json)

---

## Integration Flow

```
1. Customer initiates payment on your platform
2. You call POST /api/v1/easypaisa/charge with customer's mobile
3. Customer receives OTP/PIN on their Easypaisa app
4. Customer confirms payment
5. You receive status:
   - APPROVED (immediate) - payment complete
   - PENDING - customer hasn't confirmed yet
   - FAILED - payment rejected
```

---

## Support

For API issues or questions:
- Technical Support: tech@myco.io
- Documentation: See [Architecture](ARCHITECTURE.md)

---

**Last Updated:** December 16, 2025

