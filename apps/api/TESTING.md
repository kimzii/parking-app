# Auth Security Features Testing Guide

## 🔒 Features Implemented

1. **Rate Limiting** - Prevents brute force attacks
2. **Account Lockout** - Locks accounts after failed login attempts
3. **IP Tracking** - Tracks login IP addresses
4. **Resend Verification** - Allows users to resend verification codes
5. **CORS Protection** - Restricts which origins can access the API
6. **Security Headers** - Adds Helmet.js security headers

---

## 🧪 Testing Instructions

### 1. Rate Limiting Tests

#### Test Login Rate Limiting

**Endpoint:** `POST http://localhost:3001/auth/login`

**What to test:** Try logging in 6 times within 1 minute

```json
{
  "email": "test@example.com",
  "password": "wrongpassword"
}
```

**Expected Result:**

- First 5 attempts: Returns error messages
- 6th attempt: `429 Too Many Requests` with message "ThrottlerException: Too Many Requests"

**How to reset:** Wait 1 minute

---

#### Test Resend Verification Rate Limiting

**Endpoint:** `POST http://localhost:3001/auth/resend-verification`

**What to test:** Try resending verification 4 times within 1 minute

```json
{
  "email": "test@example.com"
}
```

**Expected Result:**

- First 3 attempts: Success
- 4th attempt: `429 Too Many Requests`

---

### 2. Account Lockout Tests

#### Test Failed Login Attempts

**Endpoint:** `POST http://localhost:3001/auth/login`

**Steps:**

1. Register a new user and verify email
2. Attempt login with **wrong password** 5 times (wait 2-3 seconds between each attempt to avoid rate limiting)

```json
{
  "email": "lockout@test.com",
  "password": "WrongPassword123!"
}
```

**Expected Results:**

- Attempt 1: `"Invalid credentials. 4 attempts remaining"`
- Attempt 2: `"Invalid credentials. 3 attempts remaining"`
- Attempt 3: `"Invalid credentials. 2 attempts remaining"`
- Attempt 4: `"Invalid credentials. 1 attempt remaining"`
- Attempt 5: `"Too many failed attempts. Account locked for 30 minutes"`
- Attempt 6+: `"Account locked. Try again in X minutes"`

**How to unlock:**

- Wait 30 minutes OR
- Manually reset in database:

```sql
UPDATE users
SET login_attempts = 0, locked_until = NULL
WHERE email = 'lockout@test.com';
```

---

#### Test Successful Login Resets Counter

**Steps:**

1. Login with wrong password 2 times
2. Login with **correct password**
3. Check that counter is reset (try wrong password again - should show "4 attempts remaining")

---

### 3. IP Tracking Tests

#### Test IP Address Recording

**Endpoint:** `POST http://localhost:3001/auth/login`

**Steps:**

1. Login successfully
2. Check database to verify IP was recorded:

```sql
SELECT email, last_login_at, last_login_ip
FROM users
WHERE email = 'your@email.com';
```

**Expected Result:**

- `last_login_at` should be current timestamp
- `last_login_ip` should be your IP (likely `::1` or `::ffff:127.0.0.1` for localhost)

---

### 4. Resend Verification Tests

#### Test Resend Verification Code

**Endpoint:** `POST http://localhost:3001/auth/resend-verification`

**Steps:**

1. Register a new user (don't verify yet)
2. Request resend verification

```json
{
  "email": "newuser@test.com"
}
```

**Expected Result:**

```json
{
  "message": "If the email exists, a verification code has been sent",
  "verificationCode": "123456"
}
```

**Terminal Output:**

```
New verification code for newuser@test.com: 123456
```

---

#### Test Resend for Already Verified Email

**Steps:**

1. Use an already verified email

```json
{
  "email": "verified@test.com"
}
```

**Expected Result:**

```json
{
  "message": "Email already verified",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

#### Test Resend for Non-existent Email

**Steps:**

1. Use email that doesn't exist

```json
{
  "email": "doesnotexist@test.com"
}
```

**Expected Result:**

```json
{
  "message": "If the email exists, a verification code has been sent"
}
```

**Note:** System doesn't reveal if email exists (security best practice)

---

### 5. CORS Tests

#### Test Valid Origin

**In Browser Console or Frontend:**

```javascript
fetch('http://localhost:3001/auth/test', {
  method: 'GET',
  credentials: 'include',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN_HERE',
  },
});
```

**Expected Result:** Request succeeds (if from localhost:3000, localhost:5173, or localhost:8081)

---

#### Test Invalid Origin

**Steps:**

1. Try accessing from a different port (e.g., localhost:4000)

**Expected Result:** CORS error in browser console

---

### 6. Security Headers Tests

#### Test Helmet Headers

**Using Postman or curl:**

```bash
curl -I http://localhost:3001/auth/login
```

**Expected Headers:**

```
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Download-Options: noopen
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
```

---

## 📊 Database Verification Queries

### Check User Security Fields

```sql
SELECT
  email,
  login_attempts,
  locked_until,
  last_login_at,
  last_login_ip,
  email_verified,
  status
FROM users
WHERE email = 'your@email.com';
```

### Reset Account Lockout

```sql
UPDATE users
SET login_attempts = 0, locked_until = NULL
WHERE email = 'locked@test.com';
```

### View All Locked Accounts

```sql
SELECT email, login_attempts, locked_until
FROM users
WHERE locked_until > NOW();
```

---

## 🎯 Complete Test Scenario

**Recommended Full Test Flow:**

1. **Register** → `POST /auth/register`

   ```json
   {
     "email": "test@example.com",
     "password": "Test123!@#",
     "role": "DRIVER"
   }
   ```

2. **Verify Email** → `POST /auth/verify-email`

   ```json
   {
     "email": "test@example.com",
     "code": "123456"
   }
   ```

3. **Login** → `POST /auth/login` (check IP tracking in DB)

   ```json
   {
     "email": "test@example.com",
     "password": "Test123!@#"
   }
   ```

4. **Test Protected Route** → `GET /auth/test` (with Bearer token)

   ```
   Authorization: Bearer YOUR_ACCESS_TOKEN
   ```

5. **Test Rate Limiting** → Login 6 times quickly

6. **Test Account Lockout** → Login with wrong password 5 times

7. **Test Resend Verification** → Register new user, resend code

   ```json
   {
     "email": "newuser@test.com"
   }
   ```

8. **Refresh Token** → `POST /auth/refresh`
   ```json
   {
     "refreshToken": "YOUR_REFRESH_TOKEN"
   }
   ```

---

## 🚨 Common Issues & Solutions

### Issue: "Too Many Requests" on first attempt

**Solution:** Wait 1 minute, rate limit state is in memory

### Issue: Account locked but can't test unlock

**Solution:** Run SQL query to reset:

```sql
UPDATE users SET login_attempts = 0, locked_until = NULL WHERE email = 'your@email.com';
```

### Issue: CORS errors in browser

**Solution:** Make sure you're accessing from allowed origins (localhost:3000, 3001, 5173, 8081)

### Issue: IP shows as `::1` or `::ffff:127.0.0.1`

**Solution:** This is correct for localhost (IPv6 localhost address)

---

## 📝 Quick Postman Collection

Create these requests in Postman:

1. **Register** - POST `http://localhost:3001/auth/register`
2. **Verify** - POST `http://localhost:3001/auth/verify-email`
3. **Login** - POST `http://localhost:3001/auth/login`
4. **Test Protected** - GET `http://localhost:3001/auth/test` (with Bearer token)
5. **Resend Verification** - POST `http://localhost:3001/auth/resend-verification`
6. **Refresh Token** - POST `http://localhost:3001/auth/refresh`
7. **Forgot Password** - POST `http://localhost:3001/auth/forgot-password`
8. **Reset Password** - POST `http://localhost:3001/auth/reset-password`

---

## ✅ Expected Production Behavior

- ✅ Users locked after 5 failed attempts (30 min)
- ✅ Rate limits prevent rapid-fire requests
- ✅ IP addresses logged for audit trail
- ✅ Security headers protect against common attacks
- ✅ CORS prevents unauthorized origins
- ✅ Failed attempts reset on successful login
