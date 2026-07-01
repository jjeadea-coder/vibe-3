from fastapi import APIRouter

router = APIRouter(prefix="/news", tags=["news"])


@router.get("")
def list_news() -> dict[str, list[dict[str, str]]]:
    return {"items": []}
