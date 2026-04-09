# ParkLink — Test Cases

---

## FUNCTIONAL TEST CASES

---

### MODULE 1: AUTHENTICATION

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-AUTH-001 | Successful user registration — a new user can create an account with valid details | 1. Open app and tap "Create Account" 2. Fill in all fields 3. Accept Terms & Privacy 4. Tap "Create Account" | First name: Juan, Last name: Dela Cruz, Email: juan@email.com, Phone: 09171234567, Password: Juan@1234 | Account created, user redirected to email verification screen, verification email sent | Account created successfully, verification code sent to email, redirected to verify screen | Pass |
| TC-AUTH-002 | Registration fails with duplicate email or phone — system blocks registration if either is already in use | 1. Attempt to register with an already-registered email 2. Attempt to register with an already-registered phone number | Email: existing@email.com (registered); Phone: 09171234567 (registered) | Error shown for each: email or phone already in use, registration does not proceed | Alert "Email is already registered" or "Phone number is already registered" shown, registration blocked | Pass |
| TC-AUTH-003 | Registration blocked by weak password or missing consent — system enforces password rules and requires both checkboxes | 1. Enter a weak password and tap "Create Account" 2. Fill in valid fields but leave both checkboxes unchecked and observe the button | Password: password123 (no uppercase or special character); All valid fields, checkboxes unchecked | Weak password: inline indicators turn red, alert shown. Missing consent: "Create Account" button is disabled | Inline password requirement indicators turn red; button grayed out and non-interactive until both checkboxes are checked | Pass |
| TC-AUTH-004 | Login: success with correct credentials and rejection with wrong password | 1. Enter correct email and password, tap "Log In" 2. Enter correct email but wrong password, tap "Log In" | Success — Email: juan@email.com, Password: Juan@1234; Failure — Password: WrongPass1! | Success: user logged in and redirected to home screen. Failure: "Invalid credentials" error | Login successful, tokens stored, redirected to correct home screen; Alert "Invalid credentials" on wrong password | Pass |
| TC-AUTH-005 | Email verification flow — user verifies account using the 6-digit code sent to their email | 1. Check email for verification code 2. Enter code on verification screen 3. Tap "Verify" | Verification code from email inbox | Email verified, user proceeds to role selection or home screen | Code accepted, email marked verified, user auto-logged in and redirected to role selection screen | Pass |
| TC-AUTH-006 | Forgot password — reset code sent for registered email; system does not reveal account existence for unregistered email | 1. Tap "Forgot Password", enter registered email, tap "Send Reset Code" 2. Repeat using an unregistered email | Registered: juan@email.com; Unregistered: notregistered@email.com | Both show the same generic success message; 6-digit code only sent for the registered email | Same success alert shown for both cases, no account info leaked, user redirected to reset password screen | Pass |
| TC-AUTH-007 | Password reset success — valid 6-digit code accepted, new password saved, user can log in with new password | 1. Open password reset email and copy the 6-digit code 2. Navigate to reset password screen 3. Enter email, code, new password, and confirm 4. Tap "Reset Password" | 6-digit reset code from email, New password: NewPass@5678, Confirm: NewPass@5678 | Password updated, user redirected to login screen, old password no longer works | Code accepted, password updated in database, alert shown, user redirected to login screen | Pass |
| TC-AUTH-008 | Password reset fails with expired code or mismatched passwords — form rejects both invalid states | 1. Request a reset code, wait over 5 minutes, then submit the expired code 2. Enter a valid code but mismatched new password and confirm password | Expired code (>5 min old); Valid code, New: NewPass@5678, Confirm: Different@999 | Expired code: error "Reset code expired". Mismatched passwords: error "Passwords do not match", password unchanged | Alert "Reset code expired" on expired code; Alert "Passwords do not match" on mismatch, no password change | Pass |
| TC-AUTH-009 | Change password: success with correct current password and rejection with wrong current password | 1. Go to profile settings, tap "Change Password", enter correct current password, new password, confirm, and submit 2. Repeat using the wrong current password | Success — Current: Juan@1234, New: Updated@5678, Confirm: Updated@5678; Failure — Current: WrongPass1! | Success: password updated, new password required on next login. Failure: "Current password is incorrect" | Alert "Password changed successfully" on success; Alert "Current password is incorrect" on wrong current password | Pass |

---

### MODULE 2: BOOKING FLOW

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-BOOK-001 | Driver successfully books a parking spot — a verified driver with a registered vehicle and sufficient balance can complete a booking | 1. Open map 2. Select a location 3. Tap "View Details" 4. Select space and vehicle 5. Tap "Pay & Book Now" 6. Confirm | Driver: VERIFIED status, Wallet balance: ₱200, Hourly rate: ₱50, 1 active vehicle registered | Booking created (PENDING), first-hour fee deducted from wallet, host notified | | |
| TC-BOOK-002 | Booking blocked when driver is not verified — unverified drivers cannot make bookings | 1. Log in as a driver with PENDING verification status 2. Navigate to a parking spot booking screen | Driver verification status: PENDING (not yet approved by admin) | Booking is blocked, error shown: driver must be verified before booking | | |
| TC-BOOK-003 | Booking blocked when driver has no registered vehicle — driver must add a vehicle before booking | 1. Log in as a verified driver with no active vehicles 2. Navigate to a parking spot booking screen 3. Attempt to book | Driver: VERIFIED, No active vehicles in profile | Error shown: "Please add at least one active vehicle before booking" | | |
| TC-BOOK-004 | Booking blocked when vehicle type is incompatible — driver's vehicle type must match location's accepted types | 1. Navigate to a location that only accepts motorcycles 2. Attempt to book with a car | Location accepts: MOTORCYCLE only, Driver vehicle type: CAR | Error shown: location does not accept driver's vehicle type | | |
| TC-BOOK-005 | Booking blocked when wallet is insufficient — driver cannot book if balance is below the first-hour fee | 1. Navigate to a parking spot booking screen | Driver wallet balance: ₱10, Hourly rate: ₱50 | Book button disabled, shows "Insufficient Balance", cannot proceed | | |
| TC-BOOK-006 | Booking blocked when driver has outstanding balance — driver with PAYMENT_PENDING reservation cannot make new bookings | 1. Navigate to any parking spot booking screen | Driver has 1 existing PAYMENT_PENDING reservation | Book button disabled, shows "Settle Outstanding Balance First" | | |
| TC-BOOK-007 | Low balance warning shown for 1-hour coverage — orange banner shown when wallet only covers 1 hour | 1. Navigate to booking screen with wallet covering exactly 1 hour | Driver wallet: ₱50, Hourly rate: ₱50 | Orange warning banner shown: booking credit is only for 1 hour | | |
| TC-BOOK-008 | Host approves a booking — host can approve a pending booking request | 1. Host opens booking from dashboard 2. Taps "Approve" 3. Confirms | Booking in PENDING status | Booking → CONFIRMED, driver receives approval notification with 60-min arrival window | | |
| TC-BOOK-009 | Host rejects a booking — host can reject a pending booking and escrow is refunded | 1. Host opens booking 2. Taps "Reject" 3. Confirms | Booking in PENDING status | Booking cancelled, escrow refunded to driver wallet, driver notified of rejection | | |
| TC-BOOK-010 | Booking auto-expires when driver does not arrive — CONFIRMED booking expires after 1-hour arrival window | 1. Allow arrival deadline to pass without driver arriving | CONFIRMED booking, 1 hour elapsed since approval | Booking → EXPIRED, escrow forfeited, driver notified "Booking Expired", host notified "Driver Did Not Arrive", slot freed | | |
| TC-BOOK-011 | Driver cancels booking before arrival — driver can cancel a confirmed booking before arriving | 1. Driver opens reservation 2. Taps cancel 3. Confirms | Booking in CONFIRMED status | Booking cancelled, host notified, parking slot freed | | |

---

### MODULE 3: SESSION & PAYMENT

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-PAY-001 | First hour fee deducted on booking — wallet balance decreases by exactly the first-hour fee when booking is created | 1. Complete a booking 2. Check wallet balance before and after | Wallet before: ₱200, Hourly rate: ₱50 | Wallet reduced by exactly ₱50 (first-hour fee) | | |
| TC-PAY-002 | Session completes with correct total charge — additional hours billed correctly on exit | 1. Driver scans exit QR after 3 hours 2. Check wallet deduction | Session duration: 3 hours, Hourly rate: ₱50, First hour already paid | Additional ₱100 deducted (2 remaining hours × ₱50). Total session charge: ₱150 | | |
| TC-PAY-003 | 10% platform commission deducted from host payout — host receives 90% of total session fee | 1. Complete a session 2. Check host wallet credit | Total session fee: ₱100, Platform rate: 10% | Host wallet credited ₱90. Commission of ₱10 retained by platform | | |
| TC-PAY-004 | PAYMENT_PENDING set when wallet insufficient at exit — reservation flagged when driver cannot pay full amount on exit | 1. Driver scans exit QR with insufficient wallet balance | Session fee owed: ₱150, Driver wallet: ₱50 | Reservation → PAYMENT_PENDING, remainingDue: ₱100 stored, driver and host notified | | |
| TC-PAY-005 | Driver settles outstanding balance — driver can pay the remaining due amount after topping up | 1. Top up wallet 2. Tap "Pay Now" on outstanding balance 3. Confirm | PAYMENT_PENDING reservation, remainingDue: ₱100, Wallet after top-up: ₱150 | RemainingDue deducted, host receives payout, reservation → COMPLETED, both parties notified | | |
| TC-PAY-006 | Pay Now redirects to top-up when still insufficient — app redirects instead of showing unhelpful alert | 1. Tap "Pay Now" with wallet still below remaining due | PAYMENT_PENDING reservation, remainingDue: ₱100, Wallet: ₱30 | App redirects to top-up screen instead of showing an error alert | | |
| TC-PAY-007 | Top-up request flow — driver can request a wallet top-up and receive credit after admin approval | 1. Tap "Top Up" 2. Enter amount 3. Submit 4. Admin accepts 5. Driver scans QR 6. Uploads proof 7. Admin approves | Top-up amount: ₱500 | Wallet credited with ₱500, driver notified at each step of the process | | |
| TC-PAY-008 | Withdrawal request flow — user can withdraw wallet balance after admin approval | 1. Tap "Withdraw" 2. Enter amount 3. Submit 4. Admin approves | Wallet balance: ₱300, Withdrawal amount: ₱200 | Wallet decreased by ₱200, user notified of approval | | |

---

### MODULE 4: NOTIFICATIONS

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-NOTIF-001 | Host notified of new booking request — host receives notification when driver submits a booking | 1. Driver completes a booking 2. Check host notifications | Driver submits booking for a host's location | Host receives push + in-app "New Booking Request" notification | | |
| TC-NOTIF-002 | Driver receives booking approved notification — driver is notified when host approves | 1. Host approves a pending booking | Driver has PENDING booking, notifications enabled | Driver receives push + in-app "Booking Approved" notification | | |
| TC-NOTIF-003 | Driver receives booking cancelled notification — driver is notified when host cancels | 1. Host rejects/cancels a booking | Booking in PENDING or CONFIRMED status | Driver receives "Booking Cancelled" notification | | |
| TC-NOTIF-004 | Both parties notified when driver is approaching (500m) — single notification sent to driver and host | 1. Driver navigates toward location 2. Driver enters within 500m of spot | CONFIRMED booking, driver GPS active, driver within 500m | Driver: "Almost There!", Host: "Driver Approaching". Fires once per reservation | | |
| TC-NOTIF-005 | Both parties notified when driver arrives (12m) — arrival notification sent to driver and host | 1. Driver enters within 12m of location | CONFIRMED booking, driver GPS active, driver within 12m | Driver: "You Have Arrived!", Host: "Driver Has Arrived". Fires once only | | |
| TC-NOTIF-006 | Approaching notification does not fire multiple times — server dedup prevents repeat sends | 1. Driver enters 500m zone (fires) 2. Driver exits and re-enters 500m zone | Driver already has DRIVER_NEARBY record for that reservation | No duplicate notification sent | | |
| TC-NOTIF-007 | Both parties notified when booking expires due to no-show — auto-cancellation notifications sent | 1. Allow CONFIRMED booking's 1-hour arrival window to expire | CONFIRMED booking past arrival deadline | Driver: "Booking Expired — No Arrival", Host: "Driver Did Not Arrive" | | |
| TC-NOTIF-008 | Both parties notified when session completes normally — completion notifications sent on exit QR scan | 1. Driver scans exit QR to end session | Active session, sufficient wallet balance | Driver: "Booking Completed", Host: "Booking Completed" | | |
| TC-NOTIF-009 | Driver notified of insufficient balance at exit — driver notified when wallet cannot cover full session cost | 1. Driver scans exit QR with insufficient wallet | Session fee owed: ₱150, Driver wallet: ₱50 | Driver receives "Insufficient Balance — Payment Due" notification, host receives "Payout On Hold" | | |
| TC-NOTIF-010 | Host notified when driver settles outstanding balance — payout released notification sent to host | 1. Driver settles outstanding balance via Pay Now | PAYMENT_PENDING reservation, driver pays remaining due | Host receives "Payout Released" notification, driver receives "Booking Completed" | | |
| TC-NOTIF-011 | Driver notified when admin cancels session — both driver and host receive cancellation notification | 1. Admin cancels an active session with a reason | Reservation in ACTIVE status | Driver and host receive "Session Cancelled by Admin" notification with reason | | |
| TC-NOTIF-012 | Driver notified when verification is approved — driver receives notification after admin verifies account | 1. Admin approves driver verification documents | Driver application submitted and under review | Driver receives "Driver Verified" push + in-app notification | | |
| TC-NOTIF-013 | Host notified when host account is verified — host receives notification when admin verifies account | 1. Admin verifies a host account | Host registration completed | Host receives "Host Account Verified" push + in-app notification | | |
| TC-NOTIF-014 | Host notified when location is approved — host receives notification when admin approves listing | 1. Admin approves a pending parking location | Location in PENDING status | Host receives "Location Approved" notification | | |
| TC-NOTIF-015 | Host notified when location is rejected — host receives notification with rejection reason | 1. Admin rejects a pending parking location with a reason | Location in PENDING status | Host receives "Location Rejected" notification with reason | | |
| TC-NOTIF-016 | Admin notified for new driver application — admins receive notification when a new driver applies | 1. User selects DRIVER role after email verification | New user selects DRIVER role | All admins receive "New Driver For Approval" notification | | |
| TC-NOTIF-017 | Admin notified for new listing submission — admins receive notification when host submits a location | 1. Host submits a new parking location | Host submits location for approval | All admins receive "New Listing For Approval" notification | | |
| TC-NOTIF-018 | Admin notified for new top-up request — all admins receive notification when driver submits top-up | 1. Driver submits a top-up request | Top-up amount: ₱500 | All admins receive "New Top-Up Request" notification with driver name and amount | | |
| TC-NOTIF-019 | Driver notified when top-up is accepted — driver is notified to proceed with GCash payment | 1. Admin accepts a top-up request | Top-up request submitted, admin clicks Accept | Driver receives "Top-Up Accepted" notification with instructions to pay via GCash | | |
| TC-NOTIF-020 | Driver notified when top-up is approved — driver is notified when wallet is credited | 1. Admin approves top-up after driver uploads proof | Driver uploaded payment proof | Driver receives "Top-Up Approved" notification, wallet credited | | |
| TC-NOTIF-021 | Driver notified when top-up is rejected — driver is notified with a rejection reason | 1. Admin rejects a top-up request | Top-up request with invalid proof | Driver receives "Top-Up Rejected" notification with reason | | |
| TC-NOTIF-022 | Driver notified when top-up request expires — driver notified if request is not acted on within time limit | 1. Submit a top-up request 2. Allow it to expire without admin action | Top-up request past expiry threshold | Driver receives "Top-Up Expired" notification | | |
| TC-NOTIF-023 | Admin notified for new withdrawal request — all admins receive notification when user requests withdrawal | 1. User submits a withdrawal request | Withdrawal amount: ₱200 | All admins receive "New Withdrawal Request" notification | | |
| TC-NOTIF-024 | User notified when withdrawal is approved — user is notified when wallet is debited and GCash sent | 1. Admin approves a withdrawal request | Withdrawal request pending admin approval | User receives "Withdrawal Approved" notification with amount and GCash number | | |
| TC-NOTIF-025 | User notified when withdrawal is rejected — user is notified with a rejection reason | 1. Admin rejects a withdrawal request | Withdrawal request under review | User receives "Withdrawal Rejected" notification with reason, wallet unchanged | | |

---

### MODULE 5: RATINGS & REVIEWS

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-RATE-001 | Driver can rate a parking location — driver submits a star rating after completing a session | 1. Open completed reservation 2. Submit star rating and optional comment | Reservation status: COMPLETED, Rating: 4 stars, Comment: "Clean and accessible" | Review saved, location's average rating updated to reflect new submission | | |
| TC-RATE-002 | Host can rate a driver — host submits a rating for the driver after a completed session | 1. Open completed reservation 2. Submit star rating and comment for the driver | Reservation status: COMPLETED, Rating: 5 stars, Comment: "On time and courteous" | Review saved, driver's overall rating updated | | |
| TC-RATE-003 | Cannot submit duplicate review for same reservation — system blocks a second review for the same reservation | 1. Submit a review for a completed reservation 2. Attempt to submit another review for the same reservation | Same reservation ID used twice | Error: already reviewed this reservation | | |
| TC-RATE-004 | Cannot review an incomplete reservation — review only allowed for COMPLETED reservations | 1. Attempt to submit a review for an ACTIVE or PENDING reservation | Reservation status: ACTIVE or PENDING | Error: can only review completed reservations | | |
| TC-RATE-005 | Admin is flagged when a user's average rating drops below 2.5 after 10 reviews — system auto-notifies admins of low-rated users | 1. Submit 10 HOST_TO_DRIVER reviews for a driver with ratings averaging below 2.5 2. Check admin notifications | Driver with 10 reviews, all rated 2 stars (avg = 2.0, threshold = 2.5) | All admins receive "Low Rating Flagged" notification with the driver's name, average rating, and total review count | | |
| TC-RATE-006 | Low rating flag is not triggered when review count is below 10 — system requires at least 10 reviews before flagging | 1. Submit 9 HOST_TO_DRIVER reviews for a driver all rated 1 star 2. Check admin notifications | Driver with 9 reviews, all rated 1 star | No low rating notification sent — minimum of 10 reviews required before flagging | | |
| TC-RATE-007 | Low rating flag respects 7-day cooldown — admins are not re-notified within 7 days of a previous flag for the same user | 1. Trigger a low rating flag for a driver 2. Submit another low rating review within 7 days 3. Check admin notifications | Driver already flagged within last 7 days | No duplicate flag notification sent within the 7-day cooldown period | | |

---

### MODULE 6: HOST MANAGEMENT

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-HOST-001 | Host submits a parking location for approval — host can list a new parking space for admin review | 1. Navigate to Spaces tab 2. Tap "Add Location" 3. Fill in all fields 4. Submit | Location name: "SM North Parking", Address, hourly rate: ₱50, slot count: 5 | Location created (PENDING), admin receives "New Listing For Approval" notification | | |
| TC-HOST-002 | Location not visible to drivers before approval — pending locations are hidden from the driver map | 1. Driver opens map near the location's address | Location status: PENDING | Location does not appear on the driver map | | |
| TC-HOST-003 | Location appears on map after admin approval — approved location is visible on map and host is notified | 1. Admin approves a pending location 2. Driver opens map near the location | Location status: just approved by admin | Location marker appears on driver map, host receives "Location Approved" notification | | |
| TC-HOST-004 | Available slot count updates on booking and cancellation — slot count is accurate in real time | 1. Note initial available slot count 2. Driver books one space 3. Check count 4. Cancel booking 5. Check count | Location with 5 slots, 1 booking made then cancelled | Count decreases by 1 on booking (→ 4), increases by 1 on cancellation (→ 5) | | |

---

### MODULE 7: ADMIN

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-ADMIN-001 | Admin verifies a driver application — admin can approve a driver's identity verification documents | 1. Open driver applications list 2. Review submitted documents 3. Click "Verify" | Driver with submitted valid ID and license documents | Driver → VERIFIED, driver receives "Driver Verified" notification, driver can now book spots | | |
| TC-ADMIN-002 | Admin rejects a driver application — admin can reject a driver with a reason | 1. Review driver application 2. Click "Reject" 3. Enter rejection reason | Driver with incomplete or invalid documents | Driver → REJECTED, driver notified with rejection reason | | |
| TC-ADMIN-003 | Admin cancels an active session — admin can forcibly cancel an ongoing parking session | 1. Find an active reservation in admin panel 2. Click "Cancel Session" 3. Provide reason | Reservation in ACTIVE status | Session cancelled, driver and host receive "Session Cancelled by Admin" notification | | |
| TC-ADMIN-004 | Admin approves top-up after proof submitted — admin can approve a top-up request after reviewing payment proof | 1. Open top-up request 2. Review uploaded payment proof 3. Click "Approve" | Top-up request with valid proof image, amount: ₱500 | Driver wallet credited ₱500, driver notified of approval | | |
| TC-ADMIN-005 | Admin rejects top-up with reason — admin can reject a top-up request and driver is notified | 1. Open top-up request 2. Click "Reject" 3. Enter reason | Top-up request with unclear or invalid proof | Top-up rejected, driver notified with rejection reason, wallet balance unchanged | | |

---

## NON-FUNCTIONAL TEST CASES

---

### MODULE 8: PERFORMANCE

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-PERF-001 | Map loads nearby spots within acceptable time — map markers appear within 2 seconds of opening | 1. Open map tab 2. Measure time from screen open to markers appearing | GPS enabled, 10+ active locations near test coordinates | Markers appear within 2 seconds | | |
| TC-PERF-002 | Booking API responds within acceptable time — booking creation API completes within 1 second | 1. Tap "Pay & Book Now" 2. Measure time to booking confirmation response | Valid booking request, server under normal load | Booking confirmed within 1 second | | |
| TC-PERF-003 | Push notification delivered promptly — push notification reaches user device within 3 seconds | 1. Trigger a booking approval 2. Measure time until driver receives push notification | Notifications enabled on driver device, Expo Push service active | Notification received within 3 seconds | | |
| TC-PERF-004 | Map handles 50+ markers without lag — map remains responsive with many visible location markers | 1. Open map in area with 50+ active locations 2. Pan and zoom repeatedly | 50+ approved locations in the database | Map remains responsive, no UI freeze exceeding 500ms | | |

---

### MODULE 9: SECURITY

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-SEC-001 | Unauthenticated users cannot access protected routes — API returns 401 without a valid token | 1. Send GET /reservations without Authorization header | No JWT token in request headers | Access denied — HTTP 401 Unauthorized | | |
| TC-SEC-002 | Driver cannot access host-only endpoints — API returns 403 when driver calls host actions | 1. Call POST /reservations/host/:id/approve using a driver's JWT token | Valid driver JWT token, valid reservation ID | Access denied — HTTP 403 Forbidden | | |
| TC-SEC-003 | Driver cannot settle another driver's reservation — driver can only settle their own reservations | 1. Log in as Driver A 2. Call POST /reservations/:id/settle using Driver B's reservation ID | Driver A's JWT token, Driver B's PAYMENT_PENDING reservation ID | Access denied — HTTP 403 or 404 | | |
| TC-SEC-004 | Host cannot approve another host's reservations — host can only manage their own listings | 1. Log in as Host A 2. Attempt to approve a reservation belonging to Host B's location | Host A's JWT token, Host B's pending reservation ID | Access denied — HTTP 403 | | |
| TC-SEC-005 | JWT tokens expire correctly — expired tokens are rejected and user is redirected to login | 1. Allow JWT token to expire 2. Attempt an authenticated API request with the expired token | Expired JWT token (past expiry timestamp) | Access denied — HTTP 401, app redirects to login screen | | |

---

### MODULE 10: RELIABILITY

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-REL-001 | App handles API unreachable gracefully — app shows error message and does not crash when offline | 1. Disable device internet connection 2. Attempt to load map or reservations screen | Device in airplane mode or no network | User-friendly error message shown, app does not crash | | |
| TC-REL-002 | Exit QR scan does not double-charge — scanning exit QR twice does not deduct payment twice | 1. Scan exit QR to end session 2. Immediately scan the same QR again | Active session with valid exit QR code | Second scan rejected, wallet charged exactly once | | |
| TC-REL-003 | Approaching notification fires only once per reservation — server dedup ensures exactly 1 DRIVER_NEARBY record | 1. Driver enters 500m zone (notification fires) 2. Driver exits and re-enters 500m zone multiple times | CONFIRMED booking, driver GPS active | Notification sent on first entry only — exactly 1 DRIVER_NEARBY record in DB per reservation | | |
| TC-REL-004 | Expiry sweep handles multiple expired reservations concurrently — no conflicts or missed updates | 1. Simulate multiple CONFIRMED reservations expiring simultaneously 2. Observe sweep output | 5+ CONFIRMED reservations all past arrival deadline | All reservations updated to EXPIRED, all notifications sent, no duplicate notifications | | |

---

### MODULE 11: USABILITY

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-USE-001 | Book button clearly disabled when balance insufficient — button is grayed out with clear label | 1. Navigate to parking spot booking screen with low wallet balance | Driver wallet: ₱10, Hourly rate: ₱50 | Button grayed out, labeled "Insufficient Balance", non-interactive | | |
| TC-USE-002 | Outstanding balance warning visible in wallet card — driver can see and act on pending payment from wallet screen | 1. Navigate to Payment tab or Profile tab | Driver has PAYMENT_PENDING reservation with remainingDue: ₱100 | Wallet card shows outstanding balance (₱100) with "Pay Now" button, current balance also visible | | |
| TC-USE-003 | Date filter on host dashboard works correctly — host can filter reservations by a specific date | 1. Open host dashboard 2. Tap calendar icon 3. Select a past date 4. Tap Confirm | Host has reservations on multiple dates, select date: any past date with bookings | Only reservations from selected date shown, active date banner with clear/reset button displayed | | |
| TC-USE-004 | Terms & Conditions modal fully readable — all content is accessible and not cut off | 1. Tap "Terms and Conditions" on signup screen 2. Scroll through full content | None | All content visible and scrollable, not cut off at top or bottom, buttons fully accessible | | |

---

### MODULE 12: COMPATIBILITY

| Test Case ID | Test Case Description | Test Steps | Test Data | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-COMP-001 | App works on Android 10+ — all features function correctly on supported Android versions | 1. Install APK on Android device 2. Complete a full booking flow end-to-end | Android 10, 11, or 12 device | All features work without errors or visual issues, no crashes | | |
| TC-COMP-002 | App works on iOS 14+ — all features function correctly on supported iOS versions | 1. Install app on iOS device 2. Complete a full booking flow end-to-end | iPhone running iOS 14, 15, or 16 | All features work without errors or visual issues, no crashes | | |
| TC-COMP-003 | Admin dashboard works on major browsers — web dashboard is fully functional across browsers | 1. Open admin dashboard on Chrome 2. Repeat on Firefox 3. Repeat on Edge | Admin account, Chrome latest, Firefox latest, Edge latest | Dashboard loads and all features work on all three browsers, no layout breakage | | |
