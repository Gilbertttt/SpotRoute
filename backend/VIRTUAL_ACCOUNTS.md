# Virtual Accounts System

## Overview

The Virtual Accounts system allows each driver to have a static virtual account number that is linked to SpotRoute's main account. When users make payments to a driver's virtual account, the funds flow through SpotRoute's main account, where a commission is deducted, and the remainder is automatically transferred to the driver's bank account.

## Payment Flow

```
User Payment → Driver's Virtual Account → SpotRoute Main Account → 
Commission Deducted → Remaining Amount → Driver's Bank Account
```

## Database Schema

### Tables

1. **virtual_accounts** - Stores virtual account details for each driver
   - Each driver has one unique virtual account
   - Account numbers are auto-generated (format: SR + 8 digits)
   - Linked to SpotRoute's main account via payment provider

2. **bank_accounts** - Stores driver's actual bank account details
   - Used for payouts to drivers
   - Must be verified before automatic payouts

3. **payment_transactions** - Tracks all payment-related transactions
   - Payment received
   - Commission deducted
   - Driver payout
   - Refunds

4. **company_settings** - Stores system-wide settings
   - Commission percentage (default: 10%)
   - Main account details

## API Endpoints

### Driver Endpoints (Requires Authentication)

#### Get or Create Virtual Account
```
GET /api/driver/virtual-account
```
Returns the driver's virtual account details. Creates one if it doesn't exist.

**Response:**
```json
{
  "id": "uuid",
  "driverId": "uuid",
  "accountNumber": "SR12345678",
  "bankName": "SpotRoute Bank",
  "bankCode": "SRB",
  "accountName": "Driver Name",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Bank Account
```
GET /api/driver/bank-account
```
Returns the driver's bank account details.

#### Create or Update Bank Account
```
POST /api/driver/bank-account
Body: {
  "accountNumber": "1234567890",
  "bankName": "Access Bank",
  "bankCode": "044",
  "accountName": "Driver Name"
}
```

#### Get Payment Transactions
```
GET /api/driver/transactions?limit=50&offset=0
```
Returns paginated list of payment transactions for the driver.

#### Get Payment Statistics
```
GET /api/driver/payment-stats
```
Returns payment statistics including:
- Total received
- Total commission
- Total paid out
- Pending payout

**Response:**
```json
{
  "totalReceived": 100000,
  "totalCommission": 10000,
  "totalPaidOut": 90000,
  "pendingPayout": 0,
  "transactionCount": 10
}
```

#### Request Payout
```
POST /api/driver/payout
Body: {
  "amount": 5000
}
```
Manually request a payout from wallet balance to bank account.

### Webhook Endpoint (No Authentication)

#### Payment Webhook
```
POST /api/driver/webhook/payment
Body: {
  "virtualAccountNumber": "SR12345678",
  "amount": 5000,
  "paymentReference": "PAY-REF-123",
  "bookingId": "uuid (optional)",
  "metadata": {}
}
```

This endpoint is called by the payment provider when a payment is received. In production, this should be secured with webhook signature verification.

## Payment Processing Flow

1. **Payment Received**: User makes payment to driver's virtual account
2. **Webhook Triggered**: Payment provider sends webhook notification
3. **Payment Processed**: 
   - Payment transaction created
   - Commission calculated and deducted
   - Commission transaction created
   - Driver wallet balance updated
4. **Automatic Payout**: 
   - If bank account is verified, payout is processed automatically
   - If not verified, payout is marked as pending

## Commission Calculation

- Default commission: 10% (configurable in `company_settings` table)
- Commission is calculated as: `(amount * commissionPercentage) / 100`
- Driver receives: `amount - commissionAmount`

## Models

### VirtualAccount
- `create()` - Create a new virtual account
- `findByDriverId()` - Get virtual account by driver ID
- `findByAccountNumber()` - Get virtual account by account number
- `getOrCreate()` - Get existing or create new virtual account

### BankAccount
- `createOrUpdate()` - Create or update bank account
- `findByDriverId()` - Get bank account by driver ID
- `verify()` - Verify bank account

### PaymentTransaction
- `create()` - Create a payment transaction
- `findByDriverId()` - Get transactions for a driver
- `findByPaymentReference()` - Find transaction by payment reference

### PaymentService
- `processPaymentReceived()` - Process incoming payment
- `processDriverPayout()` - Process payout to driver
- `calculateCommission()` - Calculate commission for an amount
- `getDriverPaymentStats()` - Get payment statistics

## Environment Variables

```env
# Virtual Account Configuration
VIRTUAL_ACCOUNT_BANK_NAME=SpotRoute Bank
VIRTUAL_ACCOUNT_BANK_CODE=SRB

# Commission (can also be set in database)
COMMISSION_PERCENTAGE=10.00
```

## Integration with Payment Providers

To integrate with a real payment provider (e.g., Paystack, Flutterwave):

1. **Virtual Account Creation**: When creating a virtual account, call the provider's API to create a virtual account that routes to your main account
2. **Webhook Security**: Implement webhook signature verification
3. **Bank Transfer**: Use the provider's transfer API in `PaymentService.processDriverPayout()`

Example integration points:
- `VirtualAccount.create()` - Call provider API to create virtual account
- `PaymentService.processDriverPayout()` - Call provider API to transfer funds
- `virtualAccountController.handlePaymentWebhook()` - Verify webhook signature

## Testing

Since MySQL isn't running, the code is structured to work when the database is available. To test:

1. Start MySQL
2. The migrations will automatically create the tables
3. Register a driver account
4. Call `GET /api/driver/virtual-account` to create a virtual account
5. Simulate a payment webhook to test the flow

## Notes

- Virtual accounts are created on-demand when first accessed
- Bank accounts must be verified before automatic payouts
- All transactions are logged in `payment_transactions` table
- Commission percentage can be updated in `company_settings` table
- The system supports both automatic and manual payouts

