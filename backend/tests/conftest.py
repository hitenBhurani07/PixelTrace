import io
import os
import shutil
import tempfile
import zipfile
import pytest
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.config import settings
from backend.app.database.session import Base, get_db
from backend.app.main import app

# Test database
TEST_DB_PATH = settings.BASE_DIR / "test_pixeltrace.db"
TEST_SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH.as_posix()}"

engine_test = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    settings.ensure_directories()
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)
    engine_test.dispose()
    try:
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()
    except Exception:
        pass

@pytest.fixture
def db_session():
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def synthetic_images():
    """
    Generates synthetic images programmatically for forensic testing:
    - Base reference image (a colorful shape geometric pattern)
    - Byte-exact duplicate of base (identical bytes)
    - Resized copy (scaled down by 50%)
    - Recompressed JPEG copy (high compression)
    - Rotated copy (90 degree rotation)
    - Unrelated image (random noise / distinct pattern)
    """
    # 1. Base image
    img_base = Image.new("RGB", (300, 300), color=(30, 60, 90))
    draw = ImageDraw.Draw(img_base)
    draw.rectangle([50, 50, 250, 250], fill=(200, 100, 50), outline=(255, 255, 255))
    draw.ellipse([80, 80, 220, 220], fill=(50, 180, 120), outline=(255, 255, 0))
    draw.line([0, 0, 300, 300], fill=(255, 0, 0), width=4)

    buf_base = io.BytesIO()
    img_base.save(buf_base, format="PNG")
    bytes_base = buf_base.getvalue()

    # 2. Resized copy
    img_resized = img_base.resize((150, 150), Image.Resampling.LANCZOS)
    buf_resized = io.BytesIO()
    img_resized.save(buf_resized, format="PNG")
    bytes_resized = buf_resized.getvalue()

    # 3. Recompressed JPEG copy
    buf_jpeg = io.BytesIO()
    img_base.save(buf_jpeg, format="JPEG", quality=40)
    bytes_jpeg = buf_jpeg.getvalue()

    # 4. Rotated copy
    img_rotated = img_base.rotate(90)
    buf_rotated = io.BytesIO()
    img_rotated.save(buf_rotated, format="PNG")
    bytes_rotated = buf_rotated.getvalue()

    # 5. Unrelated image
    img_unrelated = Image.new("RGB", (300, 300), color=(200, 220, 240))
    draw_u = ImageDraw.Draw(img_unrelated)
    for i in range(0, 300, 30):
        draw_u.line([0, i, 300, i], fill=(10, 10, 10), width=2)
    buf_unrelated = io.BytesIO()
    img_unrelated.save(buf_unrelated, format="PNG")
    bytes_unrelated = buf_unrelated.getvalue()

    # 6. Corrupt image bytes
    bytes_corrupt = b"NOT_A_REAL_IMAGE_CORRUPT_BYTES_12345"

    return {
        "base": bytes_base,
        "exact_duplicate": bytes_base,  # exact same bytes
        "resized": bytes_resized,
        "jpeg_recompressed": bytes_jpeg,
        "rotated": bytes_rotated,
        "unrelated": bytes_unrelated,
        "corrupt": bytes_corrupt
    }
