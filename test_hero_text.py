#!/usr/bin/env python3
"""
Test configurable HERO TEXT settings on Sojaru backend
Tests subtitle and 2 CTA buttons (primary_label, primary_link, secondary_label, secondary_link)
"""

import sys
import requests
import random

# Backend base URL from frontend/.env
BASE_URL = "https://vercel-ready-prod.preview.emergentagent.com/api"

# Admin credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "hello@sojaru.co.in"
ADMIN_PASSWORD = "admin123"

# Default hero values from backend/server.py
DEFAULT_HERO = {
    "subtitle": "Boldly designed everyday goods — for the humans who love hard and the pets who love harder. Made in India, for both of you.",
    "primary_label": "Shop Now",
    "primary_link": "/shop/for-you",
    "secondary_label": "Shop For Your Pet",
    "secondary_link": "/shop/for-your-pet",
}

# Test results
test_results = {"passed": [], "failed": []}

def log_pass(message):
    print(f"✅ {message}")
    test_results["passed"].append(message)

def log_fail(message):
    print(f"❌ {message}")
    test_results["failed"].append(message)

def print_summary():
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Passed: {len(test_results['passed'])}")
    print(f"Failed: {len(test_results['failed'])}")
    if test_results["failed"]:
        print("\nFailed tests:")
        for fail in test_results["failed"]:
            print(f"  - {fail}")
    print("="*80)
    return len(test_results["failed"]) == 0

def main():
    print("="*80)
    print("SOJARU HERO TEXT SETTINGS TEST")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Admin Email: {ADMIN_EMAIL}")
    print("="*80)
    
    # STEP 1: GET /api/settings and verify hero object
    print("\n[STEP 1] GET /api/settings - verify hero object exists")
    print("-" * 80)
    
    original_hero = None
    try:
        resp = requests.get(f"{BASE_URL}/settings", timeout=30)
        if resp.status_code != 200:
            log_fail(f"GET /api/settings failed with status {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        hero = data.get("hero")
        
        if not hero:
            log_fail("GET /api/settings response missing 'hero' object")
            return
        
        # Verify all required keys exist
        required_keys = ["subtitle", "primary_label", "primary_link", "secondary_label", "secondary_link"]
        missing_keys = [k for k in required_keys if k not in hero]
        
        if missing_keys:
            log_fail(f"Hero object missing keys: {missing_keys}")
            return
        
        log_pass(f"GET /api/settings returned 200 with hero object containing all required keys")
        print(f"    Current hero values:")
        for key, value in hero.items():
            print(f"      {key}: {value}")
        
        # Capture original values for restoration later
        original_hero = hero.copy()
        log_pass(f"Captured original hero values for restoration")
        
    except Exception as e:
        log_fail(f"GET /api/settings exception: {e}")
        return
    
    # STEP 2: Admin login and update hero settings
    print("\n[STEP 2] Admin login and PUT /api/admin/settings with hero data")
    print("-" * 80)
    
    # 2a: Admin login
    print("\n[2a] Admin login...")
    admin_token = None
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=30)
        
        if resp.status_code != 200:
            log_fail(f"Admin login failed with status {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        admin_token = data.get("token")
        user = data.get("user", {})
        
        if not admin_token:
            log_fail("Admin login response missing token")
            return
        
        if not user.get("is_admin"):
            log_fail(f"Admin login user.is_admin is {user.get('is_admin')}, expected True")
            return
        
        log_pass("Admin login successful with token and is_admin=True")
        
    except Exception as e:
        log_fail(f"Admin login exception: {e}")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2b: PUT /api/admin/settings with new hero data
    print("\n[2b] PUT /api/admin/settings with new hero data...")
    test_hero = {
        "subtitle": "Test tagline here",
        "primary_label": "Buy Now",
        "primary_link": "/shop/for-you",
        "secondary_label": "For Pets",
        "secondary_link": "/shop/for-your-pet"
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/admin/settings",
                          json={"hero": test_hero},
                          headers=headers,
                          timeout=30)
        
        if resp.status_code != 200:
            log_fail(f"PUT /api/admin/settings failed with status {resp.status_code}: {resp.text}")
            return
        
        log_pass("PUT /api/admin/settings returned 200")
        
    except Exception as e:
        log_fail(f"PUT /api/admin/settings exception: {e}")
        return
    
    # 2c: GET /api/settings and verify hero matches what was set
    print("\n[2c] GET /api/settings and verify hero matches...")
    try:
        resp = requests.get(f"{BASE_URL}/settings", timeout=30)
        if resp.status_code != 200:
            log_fail(f"GET /api/settings verification failed with status {resp.status_code}")
            return
        
        data = resp.json()
        actual_hero = data.get("hero", {})
        
        # Check each field
        all_match = True
        for key, expected_value in test_hero.items():
            actual_value = actual_hero.get(key)
            if actual_value != expected_value:
                log_fail(f"Hero field '{key}' mismatch. Expected '{expected_value}', got '{actual_value}'")
                all_match = False
        
        if all_match:
            log_pass("GET /api/settings confirms hero matches exactly what was set")
            print(f"    Verified hero values:")
            for key, value in actual_hero.items():
                print(f"      {key}: {value}")
        
    except Exception as e:
        log_fail(f"GET /api/settings verification exception: {e}")
        return
    
    # STEP 3: Empty-string fallback test
    print("\n[STEP 3] Empty-string fallback test")
    print("-" * 80)
    
    print("\n[3a] PUT /api/admin/settings with empty/whitespace fields...")
    empty_hero = {
        "subtitle": "   ",
        "primary_label": ""
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/admin/settings",
                          json={"hero": empty_hero},
                          headers=headers,
                          timeout=30)
        
        if resp.status_code != 200:
            log_fail(f"PUT /api/admin/settings with empty fields failed with status {resp.status_code}: {resp.text}")
            return
        
        log_pass("PUT /api/admin/settings with empty fields returned 200")
        
    except Exception as e:
        log_fail(f"PUT /api/admin/settings with empty fields exception: {e}")
        return
    
    print("\n[3b] Verify empty fields fall back to defaults...")
    try:
        resp = requests.get(f"{BASE_URL}/settings", timeout=30)
        if resp.status_code != 200:
            log_fail(f"GET /api/settings fallback verification failed with status {resp.status_code}")
            return
        
        data = resp.json()
        actual_hero = data.get("hero", {})
        
        # Check that subtitle and primary_label fell back to defaults
        subtitle_ok = actual_hero.get("subtitle") == DEFAULT_HERO["subtitle"]
        primary_label_ok = actual_hero.get("primary_label") == DEFAULT_HERO["primary_label"]
        
        if subtitle_ok and primary_label_ok:
            log_pass("Empty/whitespace fields correctly fell back to default values")
            print(f"    subtitle: {actual_hero.get('subtitle')[:50]}...")
            print(f"    primary_label: {actual_hero.get('primary_label')}")
        else:
            if not subtitle_ok:
                log_fail(f"Subtitle did not fall back to default. Got: {actual_hero.get('subtitle')}")
            if not primary_label_ok:
                log_fail(f"Primary label did not fall back to default. Got: {actual_hero.get('primary_label')}")
        
    except Exception as e:
        log_fail(f"GET /api/settings fallback verification exception: {e}")
        return
    
    # STEP 4: Authorization tests
    print("\n[STEP 4] Authorization tests")
    print("-" * 80)
    
    # 4a: No token (401)
    print("\n[4a] PUT /api/admin/settings with no token (expect 401)...")
    try:
        resp = requests.put(f"{BASE_URL}/admin/settings",
                          json={"hero": {"subtitle": "test"}},
                          timeout=30)
        
        if resp.status_code == 401:
            log_pass("PUT /api/admin/settings correctly rejected with no token (401)")
        else:
            log_fail(f"PUT /api/admin/settings returned {resp.status_code} instead of 401 for no token")
    
    except Exception as e:
        log_fail(f"PUT /api/admin/settings no-token test exception: {e}")
    
    # 4b: Non-admin token (403)
    print("\n[4b] Register normal user and test with non-admin token (expect 403)...")
    normal_token = None
    try:
        test_email = f"testuser_{random.randint(100000, 999999)}@example.com"
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User"
        }, timeout=30)
        
        if resp.status_code != 200:
            log_fail(f"Normal user registration failed with status {resp.status_code}: {resp.text}")
        else:
            data = resp.json()
            normal_token = data.get("token")
            user = data.get("user", {})
            
            if user.get("is_admin"):
                log_fail("Normal user has is_admin=True, expected False")
            else:
                log_pass("Normal user registered successfully (is_admin=False)")
    
    except Exception as e:
        log_fail(f"Normal user registration exception: {e}")
    
    if normal_token:
        print("\n[4c] PUT /api/admin/settings with non-admin token...")
        try:
            resp = requests.put(f"{BASE_URL}/admin/settings",
                              json={"hero": {"subtitle": "test"}},
                              headers={"Authorization": f"Bearer {normal_token}"},
                              timeout=30)
            
            if resp.status_code == 403:
                log_pass("PUT /api/admin/settings correctly rejected non-admin token (403)")
            else:
                log_fail(f"PUT /api/admin/settings returned {resp.status_code} instead of 403 for non-admin token")
        
        except Exception as e:
            log_fail(f"PUT /api/admin/settings non-admin test exception: {e}")
    
    # STEP 5: Regression sanity checks
    print("\n[STEP 5] Regression sanity checks")
    print("-" * 80)
    
    # 5a: GET /api/categories
    print("\n[5a] GET /api/categories...")
    try:
        resp = requests.get(f"{BASE_URL}/categories", timeout=30)
        if resp.status_code != 200:
            log_fail(f"GET /api/categories failed with status {resp.status_code}: {resp.text}")
        else:
            categories = resp.json()
            if not categories:
                log_fail("GET /api/categories returned empty list")
            else:
                log_pass(f"GET /api/categories returned 200 with {len(categories)} categories")
    
    except Exception as e:
        log_fail(f"GET /api/categories exception: {e}")
    
    # 5b: GET /api/products?per_page=3
    print("\n[5b] GET /api/products?per_page=3...")
    try:
        resp = requests.get(f"{BASE_URL}/products", params={"per_page": 3}, timeout=30)
        if resp.status_code != 200:
            log_fail(f"GET /api/products failed with status {resp.status_code}: {resp.text}")
        else:
            data = resp.json()
            items = data.get("items", [])
            if not items:
                log_fail("GET /api/products returned empty items array")
            else:
                log_pass(f"GET /api/products returned 200 with {len(items)} items")
    
    except Exception as e:
        log_fail(f"GET /api/products exception: {e}")
    
    # STEP 6: CLEANUP - Restore original hero values
    print("\n[STEP 6] CLEANUP - Restore original hero values")
    print("-" * 80)
    
    if original_hero:
        try:
            resp = requests.put(f"{BASE_URL}/admin/settings",
                              json={"hero": original_hero},
                              headers=headers,
                              timeout=30)
            
            if resp.status_code != 200:
                log_fail(f"Failed to restore original hero values: {resp.status_code}")
            else:
                log_pass("Original hero values restored successfully")
                
                # Verify restoration
                resp = requests.get(f"{BASE_URL}/settings", timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    restored_hero = data.get("hero", {})
                    if restored_hero == original_hero:
                        log_pass("Verified: hero values match original")
                    else:
                        log_fail("Warning: restored hero values do not match original")
        
        except Exception as e:
            log_fail(f"Restore original hero values exception: {e}")
    
    # Print summary
    all_passed = print_summary()
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
