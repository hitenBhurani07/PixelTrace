from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "PixelTrace"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    EVIDENCE_DIR: Path = STORAGE_DIR / "evidence"
    DERIVED_DIR: Path = STORAGE_DIR / "derived"
    REPORTS_DIR: Path = STORAGE_DIR / "reports"
    TEMPORARY_DIR: Path = STORAGE_DIR / "temporary"
    
    # SQLite Database
    DB_PATH: Path = BASE_DIR / "pixeltrace.db"
    DATABASE_URL: str = f"sqlite:///{DB_PATH.as_posix()}"
    
    # Upload limits
    MAX_IMAGE_SIZE_BYTES: int = 20 * 1024 * 1024  # 20MB per image
    MAX_ZIP_SIZE_BYTES: int = 150 * 1024 * 1024  # 150MB total zip
    MAX_ZIP_EXTRACTED_BYTES: int = 300 * 1024 * 1024 # 300MB uncompressed limit
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}

    def ensure_directories(self):
        for directory in [
            self.STORAGE_DIR,
            self.EVIDENCE_DIR,
            self.DERIVED_DIR,
            self.REPORTS_DIR,
            self.TEMPORARY_DIR
        ]:
            directory.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
