from fastapi import APIRouter

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.get("/capabilities")
def chatbot_capabilities() -> dict[str, list[str]]:
    return {"items": ["manual-upload", "query-draft", "source-citation"]}
