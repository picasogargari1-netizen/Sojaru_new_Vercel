#!/usr/bin/env python3
"""
Razorpay Payment Confirmation + Dual Emails Test Suite
Tests the payment flow: order creation, payment verification, dual emails (customer + owner), idempotency, webhook
"""

import requests
import json
import hmac
import hashlib
import time
import os
import base64
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"
RAZORPAY_KEY_SECRET = "lFPKAs9vdVKyBjYDUZpvaWNo"  # From /app/.env
ADMIN_EMAIL = "hello@sojaru.co.in"
ADMIN_PASSWORD = "admin123"
WC_STORE_URL = "https://developer.sojaru.co.in"
WC_CONSUMER_KEY = "ck_419a6e09d46defa88017c949a5810a884a3e9573"
WC_CONSUMER_SECRET = "cs_832d936678f29ec8c1946d7dd1165a223174460c"

# Test state
created_wc_orders = []
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"name": test_name, "passed": passed, "details": details})
    return passed

def get_backend_logs(lines=50):
    """Get recent backend logs"""
    try:
        result = os.popen(f"tail -n {lines} /var/log/supervisor/backend.out.log").read()
        return result
    except Exception as e:
        print(f"Warning: Could not read backend logs: {e}")
        return ""

def count_email_sent_lines_since(marker_time):
    """Count 'Email sent:' lines in backend logs after a marker time"""
    logs = get_backend_logs(200)
    lines = logs.split('\n')
    count = 0
    for line in lines:
        if "Email sent:" in line:
            count += 1
    return count

def fabricate_razorpay_signature(razorpay_order_id, razorpay_payment_id):
    """Create a valid Razorpay signature using HMAC SHA256"""
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

def cleanup_wc_orders():
    """Delete test WooCommerce orders"""
    print("\n🧹 Cleaning up test WooCommerce orders...")
    auth = (WC_CONSUMER_KEY, WC_CONSUMER_SECRET)
    for order_id in created_wc_orders:
        try:
            url = f"{WC_STORE_URL}/wp-json/wc/v3/orders/{order_id}?force=true"
            resp = requests.delete(url, auth=auth, timeout=30)
            if resp.status_code in [200, 404]:
                print(f"  ✓ Deleted WC order #{order_id}")
            else:
                print(f"  ⚠ Could not delete WC order #{order_id}: {resp.status_code}")
        except Exception as e:
            print(f"  ⚠ Error deleting WC order #{order_id}: {e}")

def test_1_get_product():
    """TEST 1: Get a real product from WooCommerce"""
    print("\n📦 TEST 1: Get a real product from WooCommerce")
    try:
        resp = requests.get(f"{BASE_URL}/api/products?per_page=1", timeout=30)
        if resp.status_code != 200:
            return log_test("Get product", False, f"Status {resp.status_code}")
        
        data = resp.json()
        if not data.get("items") or len(data["items"]) == 0:
            return log_test("Get product", False, "No products found")
        
        product = data["items"][0]
        product_id = product.get("id")
        product_name = product.get("name")
        product_price = product.get("price", "0")
        
        if not product_id:
            return log_test("Get product", False, "Product has no ID")
        
        log_test("Get product", True, f"Found product #{product_id}: {product_name} (₹{product_price})")
        return product
    except Exception as e:
        log_test("Get product", False, f"Exception: {e}")
        return None

def test_2_create_order(product):
    """TEST 2: Create an order with POST /api/orders"""
    print("\n🛒 TEST 2: Create order with POST /api/orders")
    if not product:
        return log_test("Create order", False, "No product available")
    
    try:
        timestamp = int(time.time())
        test_email = f"test-{timestamp}@example.com"
        
        order_payload = {
            "billing": {
                "first_name": "Test",
                "last_name": "Customer",
                "email": test_email,
                "phone": "9876543210",
                "address_1": "123 Test Street",
                "city": "Mumbai",
                "state": "MH",
                "postcode": "400001",
                "country": "IN"
            },
            "line_items": [
                {
                    "product_id": product["id"],
                    "quantity": 1
                }
            ],
            "shipping_lines": [
                {
                    "method_id": "free_shipping",
                    "method_title": "Free Shipping",
                    "total": "0"
                }
            ]
        }
        
        resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("Create order", False, f"Status {resp.status_code}: {resp.text[:200]}")
        
        data = resp.json()
        wc_order_id = data.get("id")
        razorpay_order_id = data.get("razorpay_order_id")
        razorpay_key_id = data.get("razorpay_key_id")
        razorpay_amount = data.get("razorpay_amount")
        
        if not wc_order_id:
            return log_test("Create order", False, "No WC order ID in response")
        
        created_wc_orders.append(wc_order_id)
        
        if not razorpay_order_id:
            return log_test("Create order", False, "No razorpay_order_id in response")
        
        if not razorpay_order_id.startswith("order_"):
            return log_test("Create order", False, f"Invalid razorpay_order_id format: {razorpay_order_id}")
        
        if not razorpay_key_id:
            return log_test("Create order", False, "No razorpay_key_id in response")
        
        if razorpay_amount is None:
            return log_test("Create order", False, "No razorpay_amount in response")
        
        log_test("Create order", True, 
                f"WC order #{wc_order_id}, Razorpay order {razorpay_order_id}, amount {razorpay_amount}")
        
        return {
            "wc_order_id": wc_order_id,
            "razorpay_order_id": razorpay_order_id,
            "razorpay_key_id": razorpay_key_id,
            "razorpay_amount": razorpay_amount,
            "test_email": test_email
        }
    except Exception as e:
        log_test("Create order", False, f"Exception: {e}")
        return None

def test_3_verify_payment(order_data):
    """TEST 3: Verify payment with fabricated valid signature"""
    print("\n✅ TEST 3: Verify payment with POST /api/payments/verify")
    if not order_data:
        return log_test("Verify payment", False, "No order data available")
    
    try:
        # Fabricate a valid payment ID and signature
        fake_payment_id = f"pay_TEST{int(time.time())}"
        razorpay_order_id = order_data["razorpay_order_id"]
        wc_order_id = order_data["wc_order_id"]
        
        # Create valid signature using HMAC SHA256
        signature = fabricate_razorpay_signature(razorpay_order_id, fake_payment_id)
        
        # Count emails before verification
        time.sleep(1)  # Brief pause to ensure logs are written
        logs_before = get_backend_logs(100)
        email_count_before = logs_before.count("Email sent:")
        
        verify_payload = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": fake_payment_id,
            "razorpay_signature": signature,
            "wc_order_id": wc_order_id
        }
        
        resp = requests.post(f"{BASE_URL}/api/payments/verify", json=verify_payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("Verify payment", False, f"Status {resp.status_code}: {resp.text[:200]}")
        
        data = resp.json()
        
        if not data.get("paid"):
            return log_test("Verify payment", False, "Response does not indicate paid=true")
        
        if data.get("status") != "processing":
            return log_test("Verify payment", False, f"Expected status 'processing', got '{data.get('status')}'")
        
        # Wait for emails to be sent
        time.sleep(3)
        
        # Check backend logs for email confirmations
        logs_after = get_backend_logs(100)
        email_count_after = logs_after.count("Email sent:")
        new_emails = email_count_after - email_count_before
        
        # Check for customer email
        customer_email_found = order_data["test_email"] in logs_after
        # Check for owner email
        owner_email_found = ADMIN_EMAIL in logs_after
        
        if new_emails < 2:
            return log_test("Verify payment", False, 
                          f"Expected 2 new 'Email sent:' lines, found {new_emails}. Customer email: {customer_email_found}, Owner email: {owner_email_found}")
        
        if not customer_email_found:
            return log_test("Verify payment", False, 
                          f"Customer email ({order_data['test_email']}) not found in logs")
        
        if not owner_email_found:
            return log_test("Verify payment", False, 
                          f"Owner email ({ADMIN_EMAIL}) not found in logs")
        
        log_test("Verify payment", True, 
                f"Payment verified, order #{wc_order_id} marked paid, {new_emails} emails sent (customer + owner)")
        
        return {**order_data, "fake_payment_id": fake_payment_id, "signature": signature}
    except Exception as e:
        log_test("Verify payment", False, f"Exception: {e}")
        return None

def test_4_idempotency(order_data):
    """TEST 4: Test idempotency - repeat verify call should not send duplicate emails"""
    print("\n🔁 TEST 4: Test idempotency - repeat verify call")
    if not order_data or "fake_payment_id" not in order_data:
        return log_test("Idempotency test", False, "No verified order data available")
    
    try:
        # Count emails before second verification
        time.sleep(1)
        logs_before = get_backend_logs(100)
        email_count_before = logs_before.count("Email sent:")
        
        verify_payload = {
            "razorpay_order_id": order_data["razorpay_order_id"],
            "razorpay_payment_id": order_data["fake_payment_id"],
            "razorpay_signature": order_data["signature"],
            "wc_order_id": order_data["wc_order_id"]
        }
        
        resp = requests.post(f"{BASE_URL}/api/payments/verify", json=verify_payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("Idempotency test", False, f"Status {resp.status_code}: {resp.text[:200]}")
        
        data = resp.json()
        
        if not data.get("paid"):
            return log_test("Idempotency test", False, "Response does not indicate paid=true")
        
        # Wait and check for new emails
        time.sleep(3)
        logs_after = get_backend_logs(100)
        email_count_after = logs_after.count("Email sent:")
        new_emails = email_count_after - email_count_before
        
        if new_emails > 0:
            return log_test("Idempotency test", False, 
                          f"Expected 0 new emails on duplicate verify, found {new_emails}")
        
        log_test("Idempotency test", True, 
                "Duplicate verify call returned 200, no duplicate emails sent")
        return True
    except Exception as e:
        log_test("Idempotency test", False, f"Exception: {e}")
        return False

def test_5_bad_signature(order_data):
    """TEST 5: Test bad signature - expect 400"""
    print("\n❌ TEST 5: Test bad signature - expect 400")
    if not order_data:
        return log_test("Bad signature test", False, "No order data available")
    
    try:
        verify_payload = {
            "razorpay_order_id": order_data["razorpay_order_id"],
            "razorpay_payment_id": "pay_INVALID123",
            "razorpay_signature": "invalid_signature_12345",
            "wc_order_id": order_data["wc_order_id"]
        }
        
        resp = requests.post(f"{BASE_URL}/api/payments/verify", json=verify_payload, timeout=30)
        
        if resp.status_code != 400:
            return log_test("Bad signature test", False, 
                          f"Expected status 400, got {resp.status_code}")
        
        data = resp.json()
        error_msg = data.get("detail", "")
        
        if "verification failed" not in error_msg.lower():
            return log_test("Bad signature test", False, 
                          f"Expected 'verification failed' error, got: {error_msg}")
        
        log_test("Bad signature test", True, 
                f"Bad signature correctly rejected with 400: {error_msg}")
        return True
    except Exception as e:
        log_test("Bad signature test", False, f"Exception: {e}")
        return False

def test_6_missing_fields():
    """TEST 6: Test missing fields - expect 400"""
    print("\n❌ TEST 6: Test missing fields - expect 400")
    try:
        # Missing razorpay_signature
        verify_payload = {
            "razorpay_order_id": "order_test123",
            "razorpay_payment_id": "pay_test123",
            "wc_order_id": "12345"
        }
        
        resp = requests.post(f"{BASE_URL}/api/payments/verify", json=verify_payload, timeout=30)
        
        if resp.status_code != 400:
            return log_test("Missing fields test", False, 
                          f"Expected status 400, got {resp.status_code}")
        
        data = resp.json()
        error_msg = data.get("detail", "")
        
        if "missing" not in error_msg.lower():
            return log_test("Missing fields test", False, 
                          f"Expected 'missing' error, got: {error_msg}")
        
        log_test("Missing fields test", True, 
                f"Missing fields correctly rejected with 400: {error_msg}")
        return True
    except Exception as e:
        log_test("Missing fields test", False, f"Exception: {e}")
        return False

def test_7_webhook_endpoint():
    """TEST 7: Test webhook endpoint - expect 500 (no secret configured)"""
    print("\n🔗 TEST 7: Test webhook endpoint - expect 500")
    try:
        webhook_payload = {}
        
        resp = requests.post(f"{BASE_URL}/api/payments/webhook", 
                           json=webhook_payload, 
                           timeout=30)
        
        if resp.status_code != 500:
            return log_test("Webhook endpoint test", False, 
                          f"Expected status 500, got {resp.status_code}")
        
        data = resp.json()
        error_msg = data.get("detail", "")
        
        if "webhook not configured" not in error_msg.lower():
            return log_test("Webhook endpoint test", False, 
                          f"Expected 'Webhook not configured' error, got: {error_msg}")
        
        log_test("Webhook endpoint test", True, 
                f"Webhook endpoint exists and rejects gracefully: {error_msg}")
        return True
    except Exception as e:
        log_test("Webhook endpoint test", False, f"Exception: {e}")
        return False

def test_8_regression():
    """TEST 8: Regression tests - settings, categories, admin login"""
    print("\n🔄 TEST 8: Regression tests")
    
    # Test GET /api/settings
    try:
        resp = requests.get(f"{BASE_URL}/api/settings", timeout=30)
        if resp.status_code != 200:
            log_test("Regression: GET /api/settings", False, f"Status {resp.status_code}")
        else:
            data = resp.json()
            if "hero" in data and "marquee_texts" in data:
                log_test("Regression: GET /api/settings", True, "Settings endpoint working")
            else:
                log_test("Regression: GET /api/settings", False, "Missing expected fields")
    except Exception as e:
        log_test("Regression: GET /api/settings", False, f"Exception: {e}")
    
    # Test GET /api/categories
    try:
        resp = requests.get(f"{BASE_URL}/api/categories", timeout=30)
        if resp.status_code != 200:
            log_test("Regression: GET /api/categories", False, f"Status {resp.status_code}")
        else:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Regression: GET /api/categories", True, f"Found {len(data)} categories")
            else:
                log_test("Regression: GET /api/categories", False, "No categories returned")
    except Exception as e:
        log_test("Regression: GET /api/categories", False, f"Exception: {e}")
    
    # Test admin login
    try:
        login_payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=30)
        if resp.status_code != 200:
            log_test("Regression: Admin login", False, f"Status {resp.status_code}")
        else:
            data = resp.json()
            if data.get("token") and data.get("user", {}).get("is_admin"):
                log_test("Regression: Admin login", True, "Admin login working")
            else:
                log_test("Regression: Admin login", False, "Missing token or is_admin flag")
    except Exception as e:
        log_test("Regression: Admin login", False, f"Exception: {e}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for t in test_results if t["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    if total - passed > 0:
        print("❌ FAILED TESTS:")
        for t in test_results:
            if not t["passed"]:
                print(f"  - {t['name']}: {t['details']}")
    else:
        print("✅ ALL TESTS PASSED!")
    
    print("\n" + "="*80)

def main():
    """Run all tests"""
    print("="*80)
    print("🧪 RAZORPAY PAYMENT CONFIRMATION + DUAL EMAILS TEST SUITE")
    print("="*80)
    print(f"Backend: {BASE_URL}")
    print(f"Admin Email: {ADMIN_EMAIL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    try:
        # Test 1: Get product
        product = test_1_get_product()
        
        # Test 2: Create order
        order_data = test_2_create_order(product)
        
        # Test 3: Verify payment (checks for dual emails)
        verified_order = test_3_verify_payment(order_data)
        
        # Test 4: Idempotency
        test_4_idempotency(verified_order)
        
        # Test 5: Bad signature
        test_5_bad_signature(order_data)
        
        # Test 6: Missing fields
        test_6_missing_fields()
        
        # Test 7: Webhook endpoint
        test_7_webhook_endpoint()
        
        # Test 8: Regression
        test_8_regression()
        
    finally:
        # Cleanup
        cleanup_wc_orders()
        
        # Print summary
        print_summary()

if __name__ == "__main__":
    main()
