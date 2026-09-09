"""
Iteration 8: Test Cloudinary upload/delete, health, auth, settings, WooCommerce endpoints
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": "hello@sojaru.co.in", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

# Health
def test_health(session):
    r = session.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("brand") == "Sojaru"
    assert data.get("status") == "ok"
    print("PASS: health check")

# Auth
def test_admin_login(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": "hello@sojaru.co.in", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["user"]["is_admin"] is True
    print("PASS: admin login")

# Settings
def test_settings(session):
    r = session.get(f"{BASE_URL}/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert "hero" in data
    assert "marquee_texts" in data
    assert "festive" in data
    print("PASS: settings")

# Products
def test_products(session):
    r = session.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    data = r.json()
    # API returns {items: [...], total: int, pages: int, page: int}
    items = data if isinstance(data, list) else data.get("items", data)
    assert isinstance(items, list)
    print(f"PASS: products ({len(items)} items)")

# Categories
def test_categories(session):
    r = session.get(f"{BASE_URL}/api/categories")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"PASS: categories ({len(data)} items)")

# Cloudinary category image upload + delete
def test_cloudinary_category_image_upload_and_delete(session, token):
    # Create a small PNG (1x1 pixel)
    png_bytes = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00'
        b'\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18'
        b'\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    slug = "test-cloudinary"
    headers = {"Authorization": f"Bearer {token}"}
    # Upload
    r = requests.post(
        f"{BASE_URL}/api/admin/category-images/{slug}",
        headers=headers,
        files={"file": ("test.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert r.status_code == 200, f"Category upload failed: {r.text}"
    data = r.json()
    category_images = data.get("category_images", {})
    assert slug in category_images, f"slug '{slug}' not in category_images: {category_images}"
    img_record = category_images[slug]
    # img_record can be a dict with "url" key or a plain URL string
    url = img_record.get("url", "") if isinstance(img_record, dict) else str(img_record)
    assert url.startswith("https://res.cloudinary.com/"), f"URL not Cloudinary: {url}"
    print(f"PASS: category image uploaded - {url}")

    # Delete
    r2 = requests.delete(
        f"{BASE_URL}/api/admin/category-images/{slug}",
        headers=headers,
    )
    assert r2.status_code == 200, f"Category delete failed: {r2.text}"
    data2 = r2.json()
    assert slug not in data2.get("category_images", {}), "slug still present after delete"
    print("PASS: category image deleted")

# Cloudinary hero image upload + delete
def test_cloudinary_hero_image_upload_and_delete(session, token):
    png_bytes = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00'
        b'\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18'
        b'\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(
        f"{BASE_URL}/api/admin/hero-images",
        headers=headers,
        files={"file": ("hero_test.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert r.status_code == 200, f"Hero upload failed: {r.text}"
    data = r.json()
    hero_images = data.get("hero_images", [])
    assert len(hero_images) > 0, "hero_images empty after upload"
    # find newly added one
    new_img = hero_images[-1]
    url = new_img.get("url", "")
    assert url.startswith("https://res.cloudinary.com/"), f"URL not Cloudinary: {url}"
    print(f"PASS: hero image uploaded - {url}")

    # Delete
    image_id = new_img["id"]
    r2 = requests.delete(
        f"{BASE_URL}/api/admin/hero-images/{image_id}",
        headers=headers,
    )
    assert r2.status_code == 200, f"Hero delete failed: {r2.text}"
    data2 = r2.json()
    ids_after = [h["id"] for h in data2.get("hero_images", [])]
    assert image_id not in ids_after, "hero image still present after delete"
    print("PASS: hero image deleted")
