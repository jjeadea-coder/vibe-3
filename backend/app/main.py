from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chatbot, excel, health, news, schedules
from app.api.routes import members
from app.core.database import initialize_database


app = FastAPI(title="Public Sector Admin Superapp API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(members.router, prefix="/api")
app.include_router(schedules.router, prefix="/api")
app.include_router(excel.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(news.router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    initialize_database()
