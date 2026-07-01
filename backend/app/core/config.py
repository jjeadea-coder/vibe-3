from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "app.sqlite3"
