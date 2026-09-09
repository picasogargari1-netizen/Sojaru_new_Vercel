"""
Vercel serverless entry point.
Imports the FastAPI app from /backend/server.py and exposes it as `app`
so Vercel's Python ASGI runtime can serve it.
"""
import sys
import os

# Add /backend to sys.path so `from server import app` resolves correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from server import app  # noqa: F401  (Vercel looks for the `app` name)
