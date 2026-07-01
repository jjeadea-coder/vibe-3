from fastapi import APIRouter

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("")
def list_schedules() -> dict[str, list[dict[str, str]]]:
    return {"items": []}
