# Backer Feature Testing Guide

## Prerequisites
- Postman installed
- API server running locally or deployed
- Stripe test account and API keys configured
- Valid JWT token for authentication

## Environment Setup

### Create Environment Variables in Postman
```
BASE_URL: http://localhost:5000 (or your deployed URL)
JWT_TOKEN: <your_valid_jwt_token>
PROJECT_ID: <valid_project_id>
DONATION_ID: <will_be_set_after_creation>
STRIPE_SECRET_KEY: <your_stripe_secret_key>
```

## Test Cases

### 1. Back a Project

**Request:**
```http
POST {{BASE_URL}}/projects/{{PROJECT_ID}}/back
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
  Content-Type: application/json

Body:
{
    "amount": 50.00,
    "currency": "USD",
    "reward_id": null  // Optional
}
```

**Expected Response:**
- Status: 200
- Response body should contain:
  ```json
  {
    "success": true,
    "data": {
        "checkout_url": "<stripe_checkout_url>",
        "session_id": "<stripe_session_id>"
    }
  }
  ```

**Test Cases:**
1. Valid backing with minimum amount
2. Backing with invalid currency (expect 400)
3. Backing with negative amount (expect 400)
4. Backing without authentication (expect 401)
5. Backing with invalid reward_id (expect 400)
6. Rate limit testing (>5 requests in 60 seconds should fail)

### 2. Payment Success Callback

**Request:**
```http
GET {{BASE_URL}}/donations/{{DONATION_ID}}/success
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
```

**Expected Response:**
- Status: 200
- Response body:
  ```json
  {
    "success": true,
    "message": "Payment processed successfully"
  }
  ```

### 3. Payment Cancel Callback

**Request:**
```http
GET {{BASE_URL}}/donations/{{DONATION_ID}}/cancel
Headers:
  Authorization: Bearer {{JWT_TOKEN}}
```

**Expected Response:**
- Status: 400
- Response body:
  ```json
  {
    "success": false,
    "message": "Payment was cancelled"
  }
  ```

### 4. Stripe Webhook Testing

**Setup:**
1. Install Stripe CLI for local webhook testing
2. Run: `stripe listen --forward-to localhost:5000/webhook`
3. Get the webhook signing secret from Stripe CLI output

**Request:**
```http
POST {{BASE_URL}}/webhook
Headers:
  Stripe-Signature: <generated_by_stripe>
Content-Type: application/json

Body: (Will be sent by Stripe)
```

**Test Cases:**
1. Valid checkout.session.completed event
2. Missing signature header (expect 400)
3. Invalid signature (expect 400)

## Database Validation

After successful tests, verify the following in the database:

1. Donation record created with:
   - Correct status progression (PENDING → COMPLETED)
   - Valid payment_session_id and payment_id
   - Correct amount and currency
   - Proper timestamps (created_at, completed_at)
   - Correct associations (user_id, project_id, reward_id)

2. Check related tables:
   - Project's total funding updated
   - Reward allocation if applicable
   - User's donation history updated

## Common Issues and Debugging

1. JWT Token Issues:
   - Ensure token is valid and not expired
   - Check permissions include 'back_project'

2. Stripe Integration:
   - Verify STRIPE_SECRET_KEY is in test mode
   - Check webhook secret matches configuration
   - Monitor Stripe dashboard for event logs

3. Rate Limiting:
   - Clear rate limit cache if needed for testing
   - Verify rate limit configuration (5 requests per 60 seconds)

## Error Scenarios to Test

1. Database Errors:
   - Concurrent donations
   - Transaction rollback scenarios

2. Stripe Errors:
   - Network timeout
   - Invalid card details
   - Insufficient funds

3. Validation Errors:
   - Missing required fields
   - Invalid data types
   - Out of range values

## Monitoring and Logs

During testing, monitor:
1. Application logs for errors and warnings
2. Stripe dashboard for payment events
3. Database transactions and locks
4. Rate limiting counters

Remember to use Stripe test cards for different scenarios:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Authentication Required: 4000 0025 0000 3155
