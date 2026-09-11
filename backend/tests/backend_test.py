"""Sojaru backend integration tests against live WooCommerce.

Covers: store config, categories, products (filters/pagination), product by slug,
variations, related, coupon validation (expected 404), orders (creates real Woo order),
auth register/login/me, account profile update, account orders.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vercel-ready-prod.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Shared state
STATE = {}


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# -------- Store / Catalog --------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("brand") == "Sojaru"


def test_store_config(s):
    r = s.get(f"{API}/store/config")
    assert r.status_code == 200
    d = r.json()
    assert d["currency_code"] == "INR", f"Expected INR, got {d.get('currency_code')}"
    assert d["currency_symbol"] == "₹", f"Expected ₹, got {d.get('currency_symbol')!r}"


@pytest.mark.parametrize("slug,expected_id", [
    ("new-arrivals", 29),
    ("featured-collection", 30),
    ("on-sale", 31),
    ("best-sellers", 32),
])
def test_group_categories_exist_and_have_products(s, slug, expected_id):
    # Category exists in /api/categories
    cats = s.get(f"{API}/categories").json()
    cat = next((c for c in cats if c["slug"] == slug), None)
    assert cat is not None, f"Category '{slug}' missing from /api/categories"
    assert cat["id"] == expected_id, f"{slug} expected id {expected_id}, got {cat['id']}"
    # Products endpoint filters by category id
    r = s.get(f"{API}/products", params={"category": cat["id"], "per_page": 8})
    assert r.status_code == 200
    d = r.json()
    assert d["total"] >= 1, f"No products in '{slug}' (id={cat['id']}) — homepage row will be empty"


def test_product_prices_are_inr_range(s):
    """After INR migration, product prices should look like INR (>= 99) not USD (<50)."""
    r = s.get(f"{API}/products", params={"per_page": 20})
    prices = [float(p["price"]) for p in r.json()["items"] if p.get("price")]
    assert prices, "no priced products"
    # Sanity: avg price should be well above typical USD values post-repricing
    assert max(prices) >= 199, f"Max price {max(prices)} looks too low for INR"


def test_categories(s):
    r = s.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list) and len(cats) > 0
    ids = {c["id"] for c in cats}
    # Parent categories per problem statement
    assert 17 in ids, "For You (id 17) not found"
    assert 18 in ids, "For Your Pet (id 18) not found"
    # Some subcategories should have parent set
    has_children = any(c["parent"] in (17, 18) for c in cats)
    assert has_children


def test_products_default(s):
    r = s.get(f"{API}/products", params={"per_page": 12})
    assert r.status_code == 200
    d = r.json()
    assert set(["items", "total", "pages", "page"]).issubset(d)
    assert d["total"] >= 1
    assert len(d["items"]) >= 1
    STATE["some_product"] = d["items"][0]


def test_products_featured(s):
    r = s.get(f"{API}/products", params={"featured": "true", "per_page": 20})
    assert r.status_code == 200
    for p in r.json()["items"]:
        assert p["featured"] is True


def test_products_on_sale(s):
    r = s.get(f"{API}/products", params={"on_sale": "true", "per_page": 20})
    assert r.status_code == 200
    # not asserting non-empty (store may have none), just structure
    assert "items" in r.json()


def test_products_orderby_price(s):
    r = s.get(f"{API}/products", params={"orderby": "price", "order": "asc", "per_page": 10})
    assert r.status_code == 200
    prices = [float(p["price"]) for p in r.json()["items"] if p.get("price")]
    assert prices == sorted(prices)


def test_products_search(s):
    r = s.get(f"{API}/products", params={"search": "tee"})
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_products_pagination(s):
    r = s.get(f"{API}/products", params={"per_page": 2, "page": 1})
    assert r.status_code == 200
    d = r.json()
    assert len(d["items"]) <= 2
    assert d["page"] == 1


def test_product_by_slug(s):
    r = s.get(f"{API}/products/slug/everyday-organic-cotton-tee")
    assert r.status_code == 200
    p = r.json()
    assert p["slug"] == "everyday-organic-cotton-tee"
    assert p["type"] == "variable"
    STATE["variable_product_id"] = p["id"]


def test_product_variations(s):
    pid = STATE.get("variable_product_id")
    assert pid, "variable product missing"
    r = s.get(f"{API}/products/{pid}/variations")
    assert r.status_code == 200
    vs = r.json()
    assert isinstance(vs, list) and len(vs) > 0
    v = vs[0]
    for k in ("id", "price", "attributes", "stock_status"):
        assert k in v


def test_related(s):
    pid = STATE.get("variable_product_id")
    r = s.get(f"{API}/related/{pid}")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_coupon_invalid(s):
    r = s.get(f"{API}/coupons/validate", params={"code": "NOPE_DOES_NOT_EXIST_XYZ"})
    assert r.status_code == 404


# -------- Auth --------
def test_register_login_me(s):
    email = f"test_pup_{uuid.uuid4().hex[:8]}@sojaru.co.in"
    pw = "sojaru123"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": pw, "first_name": "Test", "last_name": "Pup"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["token"] and data["user"]["email"] == email
    STATE["token"] = data["token"]
    STATE["email"] = email
    STATE["user_id"] = data["user"]["id"]
    STATE["wc_customer_id"] = data["user"].get("wc_customer_id")

    # login
    r2 = s.post(f"{API}/auth/login", json={"email": email, "password": pw})
    assert r2.status_code == 200
    tok2 = r2.json()["token"]

    # me
    r3 = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok2}"})
    assert r3.status_code == 200
    assert r3.json()["email"] == email


def test_login_bad_password(s):
    r = s.post(f"{API}/auth/login", json={"email": STATE["email"], "password": "wrongpw"})
    assert r.status_code == 401


def test_register_duplicate(s):
    r = s.post(f"{API}/auth/register", json={
        "email": STATE["email"], "password": "sojaru123",
        "first_name": "X", "last_name": "Y"
    })
    assert r.status_code == 400


def test_profile_update(s):
    token = STATE["token"]
    r = s.put(f"{API}/account/profile",
              headers={"Authorization": f"Bearer {token}"},
              json={"first_name": "Updated", "last_name": "Pup"})
    assert r.status_code == 200
    assert r.json()["first_name"] == "Updated"


def test_account_orders_initially(s):
    token = STATE["token"]
    r = s.get(f"{API}/account/orders", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# -------- Orders --------
def test_create_order_authenticated(s):
    token = STATE["token"]
    # get a simple product to order
    r = s.get(f"{API}/products", params={"search": "mug", "per_page": 1})
    items = r.json()["items"]
    assert items, "no product found for order"
    pid = items[0]["id"]

    billing = {
        "first_name": "Test", "last_name": "Pup",
        "address_1": "1 Test St", "city": "Mumbai", "state": "MH",
        "postcode": "400001", "country": "IN",
        "email": STATE["email"], "phone": "9999999999",
    }
    payload = {
        "line_items": [{"product_id": pid, "quantity": 1}],
        "billing": billing,
        "shipping": billing,
        "payment_method": "cod",
        "payment_method_title": "Cash on Delivery",
        "customer_note": "TEST order via backend_test",
    }
    r = s.post(f"{API}/orders", json=payload,
               headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    o = r.json()
    for k in ("id", "status", "total", "payment_url"):
        assert k in o
    STATE["order_id"] = o["id"]

    # verify via GET /api/orders/{id}
    r2 = s.get(f"{API}/orders/{o['id']}")
    assert r2.status_code == 200
    assert r2.json()["id"] == o["id"]


def test_account_orders_after_purchase(s):
    token = STATE["token"]
    # WC list can be slightly delayed; small retry
    for _ in range(3):
        r = s.get(f"{API}/account/orders", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        orders = r.json()
        if any(o["id"] == STATE["order_id"] for o in orders):
            return
        time.sleep(2)
    pytest.fail("Newly-created order not returned by /api/account/orders")
