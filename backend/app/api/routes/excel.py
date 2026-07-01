from fastapi import APIRouter

router = APIRouter(prefix="/excel", tags=["excel"])


@router.get("/capabilities")
def excel_capabilities() -> dict[str, list[str]]:
    return {"items": ["split-by-column", "merge-files"]}
