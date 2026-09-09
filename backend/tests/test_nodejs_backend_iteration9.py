"""
Iteration 9: Node.js Express backend tests on port 3002
Tests: health, auth, settings, categories, products, cloudinary, customizable-products
"""
import pytest
import requests
import os
import io

BASE = "http://localhost:3002"

# ─── Health ──────────────────────────────────────────────────────────────────
class TestHealth:
    def test_root_returns_brand_and_status(self):
        r = requests.get(f"{BASE}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("brand") == "Sojaru"
        assert data.get("status") == "ok"

# ─── Auth ────────────────────────────────────────────────────────────────────
class TestAuth:
    def test_admin_login_returns_token(self):
        r = requests.post(f"{BASE}/api/auth/login", json={"email": "hello@sojaru.co.in", "password": "admin123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data.get("user", {}).get("is_admin") is True

    def test_invalid_login_returns_401(self):
        r = requests.post(f"{BASE}/api/auth/login", json={"email": "wrong@x.com", "password": "bad"})
        assert r.status_code == 401

# ─── Settings ─────────────────────────────────────────────────────────────────
class TestSettings:
    def test_public_settings_fields(self):
        r = requests.get(f"{BASE}/api/settings")
        assert r.status_code == 200
        data = r.json()
        for field in ("hero", "marquee_texts", "festive", "category_images"):
            assert field in data, f"Missing field: {field}"

# ─── WooCommerce ──────────────────────────────────────────────────────────────
class TestWooCommerce:
    def test_categories_returns_list(self):
        r = requests.get(f"{BASE}/api/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert len(cats) >= 5, f"Expected >=5 categories, got {len(cats)}"

    def test_products_returns_items(self):
        r = requests.get(f"{BASE}/api/products")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] > 0, "Expected total > 0"

# ─── Admin fixtures ────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE}/api/auth/login", json={"email": "hello@sojaru.co.in", "password": "admin123"})
    assert r.status_code == 200
    return r.json()["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

# ─── Cloudinary category image ─────────────────────────────────────────────────
class TestCloudinaryCategoryImage:
    def test_upload_and_delete_category_image(self, admin_headers):
        # minimal 1x1 white PNG
        png = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
               b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
               b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82')
        slug = "test-nodejs"
        r = requests.post(
            f"{BASE}/api/admin/category-images/{slug}",
            headers=admin_headers,
            files={"file": ("test.png", io.BytesIO(png), "image/png")}
        )
        assert r.status_code == 200, f"Upload failed: {r.text}"
        data = r.json()
        assert "category_images" in data
        assert slug in data["category_images"], f"slug not in category_images: {data['category_images']}"
        url = data["category_images"][slug]
        assert url.startswith("https://res.cloudinary.com/"), f"URL not Cloudinary: {url}"

        # DELETE
        d = requests.delete(f"{BASE}/api/admin/category-images/{slug}", headers=admin_headers)
        assert d.status_code == 200
        assert slug not in d.json().get("category_images", {})

# ─── Cloudinary hero image ─────────────────────────────────────────────────────
class TestCloudinaryHeroImage:
    def test_upload_and_delete_hero_image(self, admin_headers):
        png = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
               b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
               b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82')
        r = requests.post(
            f"{BASE}/api/admin/hero-images",
            headers=admin_headers,
            files={"file": ("hero.png", io.BytesIO(png), "image/png")}
        )
        assert r.status_code == 200, f"Hero upload failed: {r.text}"
        data = r.json()
        assert "hero_images" in data
        assert len(data["hero_images"]) > 0
        hero_url = data["hero_images"][-1]["url"]
        assert hero_url.startswith("https://res.cloudinary.com/"), f"Not Cloudinary: {hero_url}"
        hero_id = data["hero_images"][-1]["id"]

        # DELETE
        d = requests.delete(f"{BASE}/api/admin/hero-images/{hero_id}", headers=admin_headers)
        assert d.status_code == 200

# ─── Customizable products CRUD ────────────────────────────────────────────────
class TestCustomizableProducts:
    created_id = None

    def test_create(self, admin_headers):
        r = requests.post(
            f"{BASE}/api/admin/customizable-products",
            headers=admin_headers,
            json={"product_type": "TEST_tag", "size": "S", "color": "red", "material": "cotton"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["product_type"] == "TEST_tag"
        TestCustomizableProducts.created_id = data["id"]

    def test_get_list(self, admin_headers):
        r = requests.get(f"{BASE}/api/admin/customizable-products", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_update(self, admin_headers):
        cid = TestCustomizableProducts.created_id
        if not cid:
            pytest.skip("No created ID from previous test")
        r = requests.put(
            f"{BASE}/api/admin/customizable-products/{cid}",
            headers=admin_headers,
            json={"product_type": "TEST_tag_updated", "size": "M", "color": "blue", "material": "silk"}
        )
        assert r.status_code == 200
        assert r.json()["product_type"] == "TEST_tag_updated"

    def test_delete(self, admin_headers):
        cid = TestCustomizableProducts.created_id
        if not cid:
            pytest.skip("No created ID from previous test")
        r = requests.delete(f"{BASE}/api/admin/customizable-products/{cid}", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True
