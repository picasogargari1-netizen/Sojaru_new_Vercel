#!/usr/bin/env python3
"""
Backend API Test Suite for Sojaru Customization Feature
Tests 4 new endpoints: GET /api/customizable-products, POST /api/customized-orders,
GET /api/admin/customized-orders, DELETE /api/admin/customized-orders/:id
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://store-preview-81.preview.emergentagent.com/api"
ADMIN_EMAIL = "hello@sojaru.co.in"
ADMIN_PASSWORD = "admin123"

# Test tracking
tests_passed = 0
tests_failed = 0
test_results = []


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    global tests_passed, tests_failed
    status = "✅ PASSED" if passed else "❌ FAILED"
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1
    message = f"{status}: {name}"
    if details:
        message += f"\n   {details}"
    print(message)
    test_results.append({"name": name, "passed": passed, "details": details})


def admin_login() -> Optional[str]:
    """Login as admin and return token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("token") and data.get("user", {}).get("is_admin"):
                print(f"✅ Admin login successful (is_admin={data['user']['is_admin']})")
                return data["token"]
            else:
                print(f"❌ Admin login failed: user is not admin")
                return None
        else:
            print(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Admin login error: {e}")
        return None


def test_get_customizable_products():
    """Test 1: GET /api/customizable-products (PUBLIC)"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/customizable-products (PUBLIC)")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/customizable-products", timeout=10)
        
        if response.status_code != 200:
            log_test(
                "GET /api/customizable-products returns 200",
                False,
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            return None
        
        log_test("GET /api/customizable-products returns 200", True)
        
        data = response.json()
        
        if not isinstance(data, list):
            log_test(
                "Response is a JSON array",
                False,
                f"Expected array, got {type(data)}"
            )
            return None
        
        log_test("Response is a JSON array", True)
        
        if len(data) < 2:
            log_test(
                "At least 2 products exist",
                False,
                f"Expected at least 2 products, got {len(data)}"
            )
            return None
        
        log_test("At least 2 products exist", True, f"Found {len(data)} products")
        
        # Verify structure of first item
        if data:
            item = data[0]
            required_keys = ["id", "product_type", "size", "color", "material"]
            missing_keys = [k for k in required_keys if k not in item]
            
            if missing_keys:
                log_test(
                    "Product items have correct structure",
                    False,
                    f"Missing keys: {missing_keys}"
                )
                return None
            
            log_test(
                "Product items have correct structure",
                True,
                f"Sample: product_type='{item['product_type']}', size='{item['size']}', color='{item['color']}', material='{item['material']}'"
            )
        
        print(f"\n📋 Products found: {json.dumps(data, indent=2)}")
        return data
        
    except Exception as e:
        log_test("GET /api/customizable-products", False, f"Exception: {e}")
        return None


def test_post_customized_order_valid():
    """Test 2: POST /api/customized-orders with valid data"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/customized-orders (VALID DATA)")
    print("="*80)
    
    valid_order = {
        "name": "Test User",
        "email": "test@example.com",
        "phone": "9876543210",
        "product_type": "T-shirt",
        "size": "S",
        "color": "Red",
        "material": "Polyester"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/customized-orders",
            json=valid_order,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test(
                "POST /api/customized-orders with valid data returns 200",
                False,
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            return None
        
        log_test("POST /api/customized-orders with valid data returns 200", True)
        
        data = response.json()
        
        if "id" not in data or "ok" not in data:
            log_test(
                "Response contains 'id' and 'ok' fields",
                False,
                f"Response: {data}"
            )
            return None
        
        if data.get("ok") != True:
            log_test(
                "Response 'ok' field is true",
                False,
                f"Expected ok=true, got ok={data.get('ok')}"
            )
            return None
        
        log_test(
            "Response contains 'id' and 'ok: true'",
            True,
            f"Order created with id={data['id']}"
        )
        
        print(f"\n📋 Created order: {json.dumps(data, indent=2)}")
        return data["id"]
        
    except Exception as e:
        log_test("POST /api/customized-orders with valid data", False, f"Exception: {e}")
        return None


def test_post_customized_order_missing_fields():
    """Test 3: POST /api/customized-orders with missing required fields"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/customized-orders (MISSING REQUIRED FIELDS)")
    print("="*80)
    
    # Test cases: each missing one required field
    test_cases = [
        ({"email": "test@example.com", "phone": "9876543210", "product_type": "T-shirt"}, "name"),
        ({"name": "Test User", "phone": "9876543210", "product_type": "T-shirt"}, "email"),
        ({"name": "Test User", "email": "test@example.com", "product_type": "T-shirt"}, "phone"),
        ({"name": "Test User", "email": "test@example.com", "phone": "9876543210"}, "product_type"),
    ]
    
    for payload, missing_field in test_cases:
        try:
            response = requests.post(
                f"{BASE_URL}/customized-orders",
                json=payload,
                timeout=10
            )
            
            if response.status_code != 400:
                log_test(
                    f"Missing '{missing_field}' returns 400",
                    False,
                    f"Expected 400, got {response.status_code}: {response.text}"
                )
            else:
                data = response.json()
                has_error_detail = "detail" in data or "error" in data or "message" in data
                log_test(
                    f"Missing '{missing_field}' returns 400",
                    True,
                    f"Error message: {data.get('detail', data.get('error', data.get('message', data)))}"
                )
                
        except Exception as e:
            log_test(f"Missing '{missing_field}' validation", False, f"Exception: {e}")


def test_get_admin_orders_no_auth(admin_token: str):
    """Test 4: GET /api/admin/customized-orders without token"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/admin/customized-orders (NO AUTH)")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/customized-orders", timeout=10)
        
        if response.status_code not in [401, 403]:
            log_test(
                "GET /api/admin/customized-orders without token returns 401/403",
                False,
                f"Expected 401 or 403, got {response.status_code}: {response.text}"
            )
        else:
            log_test(
                "GET /api/admin/customized-orders without token returns 401/403",
                True,
                f"Correctly rejected with {response.status_code}"
            )
            
    except Exception as e:
        log_test("GET /api/admin/customized-orders without auth", False, f"Exception: {e}")


def test_get_admin_orders_with_auth(admin_token: str, expected_order_id: Optional[str]):
    """Test 5: GET /api/admin/customized-orders with admin token"""
    print("\n" + "="*80)
    print("TEST 5: GET /api/admin/customized-orders (WITH ADMIN TOKEN)")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/customized-orders",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test(
                "GET /api/admin/customized-orders with admin token returns 200",
                False,
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            return None
        
        log_test("GET /api/admin/customized-orders with admin token returns 200", True)
        
        data = response.json()
        
        if not isinstance(data, list):
            log_test(
                "Response is a JSON array",
                False,
                f"Expected array, got {type(data)}"
            )
            return None
        
        log_test("Response is a JSON array", True, f"Found {len(data)} orders")
        
        # Verify structure if there are orders
        if data:
            item = data[0]
            required_keys = ["id", "name", "email", "phone", "product_type", "size", "color", "material", "created_at"]
            missing_keys = [k for k in required_keys if k not in item]
            
            if missing_keys:
                log_test(
                    "Order items have correct structure",
                    False,
                    f"Missing keys: {missing_keys}"
                )
            else:
                log_test(
                    "Order items have correct structure",
                    True,
                    f"Sample: name='{item['name']}', product_type='{item['product_type']}'"
                )
        
        # Check if our test order is in the list
        if expected_order_id:
            order_ids = [o["id"] for o in data]
            if expected_order_id in order_ids:
                log_test(
                    "Created order appears in admin list",
                    True,
                    f"Order {expected_order_id} found in list"
                )
            else:
                log_test(
                    "Created order appears in admin list",
                    False,
                    f"Order {expected_order_id} not found. Available IDs: {order_ids[:5]}"
                )
        
        # Verify sorting (newest first)
        if len(data) >= 2:
            first_date = data[0].get("created_at")
            second_date = data[1].get("created_at")
            if first_date and second_date:
                if first_date >= second_date:
                    log_test("Orders sorted newest first", True)
                else:
                    log_test(
                        "Orders sorted newest first",
                        False,
                        f"First: {first_date}, Second: {second_date}"
                    )
        
        print(f"\n📋 Orders (showing first 3): {json.dumps(data[:3], indent=2)}")
        return data
        
    except Exception as e:
        log_test("GET /api/admin/customized-orders with auth", False, f"Exception: {e}")
        return None


def test_delete_order_no_auth(order_id: str):
    """Test 6: DELETE /api/admin/customized-orders/:id without token"""
    print("\n" + "="*80)
    print("TEST 6: DELETE /api/admin/customized-orders/:id (NO AUTH)")
    print("="*80)
    
    try:
        response = requests.delete(
            f"{BASE_URL}/admin/customized-orders/{order_id}",
            timeout=10
        )
        
        if response.status_code not in [401, 403]:
            log_test(
                "DELETE without token returns 401/403",
                False,
                f"Expected 401 or 403, got {response.status_code}: {response.text}"
            )
        else:
            log_test(
                "DELETE without token returns 401/403",
                True,
                f"Correctly rejected with {response.status_code}"
            )
            
    except Exception as e:
        log_test("DELETE without auth", False, f"Exception: {e}")


def test_delete_order_with_auth(admin_token: str, order_id: str):
    """Test 7: DELETE /api/admin/customized-orders/:id with admin token"""
    print("\n" + "="*80)
    print("TEST 7: DELETE /api/admin/customized-orders/:id (WITH ADMIN TOKEN)")
    print("="*80)
    
    try:
        response = requests.delete(
            f"{BASE_URL}/admin/customized-orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test(
                "DELETE with admin token returns 200",
                False,
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            return False
        
        log_test("DELETE with admin token returns 200", True)
        
        data = response.json()
        
        if data.get("ok") != True:
            log_test(
                "Response contains 'ok: true'",
                False,
                f"Expected ok=true, got {data}"
            )
            return False
        
        log_test("Response contains 'ok: true'", True)
        
        # Verify order is actually deleted
        verify_response = requests.get(
            f"{BASE_URL}/admin/customized-orders",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if verify_response.status_code == 200:
            orders = verify_response.json()
            order_ids = [o["id"] for o in orders]
            
            if order_id not in order_ids:
                log_test(
                    "Order removed from admin list after deletion",
                    True,
                    f"Order {order_id} successfully deleted"
                )
            else:
                log_test(
                    "Order removed from admin list after deletion",
                    False,
                    f"Order {order_id} still exists in list"
                )
        
        return True
        
    except Exception as e:
        log_test("DELETE with admin token", False, f"Exception: {e}")
        return False


def test_delete_nonexistent_order(admin_token: str):
    """Test 8: DELETE /api/admin/customized-orders/:id with non-existent ID"""
    print("\n" + "="*80)
    print("TEST 8: DELETE /api/admin/customized-orders/:id (NON-EXISTENT ID)")
    print("="*80)
    
    fake_id = "000000000000000000000000"  # Valid ObjectId format but doesn't exist
    
    try:
        response = requests.delete(
            f"{BASE_URL}/admin/customized-orders/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 404:
            log_test(
                "DELETE non-existent order returns 404",
                False,
                f"Expected 404, got {response.status_code}: {response.text}"
            )
        else:
            log_test(
                "DELETE non-existent order returns 404",
                True,
                "Correctly returned 404 for non-existent order"
            )
            
    except Exception as e:
        log_test("DELETE non-existent order", False, f"Exception: {e}")


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("SOJARU CUSTOMIZATION FEATURE - BACKEND API TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print("="*80)
    
    # Step 1: Admin login
    print("\n🔐 STEP 1: Admin Login")
    admin_token = admin_login()
    if not admin_token:
        print("\n❌ CRITICAL: Admin login failed. Cannot proceed with admin tests.")
        sys.exit(1)
    
    # Step 2: Test GET /api/customizable-products
    products = test_get_customizable_products()
    
    # Step 3: Test POST /api/customized-orders with valid data
    order_id = test_post_customized_order_valid()
    
    # Step 4: Test POST /api/customized-orders with missing fields
    test_post_customized_order_missing_fields()
    
    # Step 5: Test GET /api/admin/customized-orders without auth
    test_get_admin_orders_no_auth(admin_token)
    
    # Step 6: Test GET /api/admin/customized-orders with auth
    orders = test_get_admin_orders_with_auth(admin_token, order_id)
    
    # Step 7: Test DELETE without auth
    if order_id:
        test_delete_order_no_auth(order_id)
    
    # Step 8: Test DELETE with auth
    if order_id:
        test_delete_order_with_auth(admin_token, order_id)
    
    # Step 9: Test DELETE non-existent order
    test_delete_nonexistent_order(admin_token)
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📊 Total: {tests_passed + tests_failed}")
    print(f"📈 Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
    print("="*80)
    
    if tests_failed > 0:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
