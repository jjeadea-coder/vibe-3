from fastapi import APIRouter

from app.core.database import get_database_health

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "public-sector-admin-superapp-api"}


@router.get("/db/health")
def database_health_check() -> dict[str, str]:
    return get_database_health()


@router.get("/health/system")
def system_health_check() -> dict[str, dict[str, str]]:
    return {
        "api": health_check(),
        "database": database_health_check(),
    }
