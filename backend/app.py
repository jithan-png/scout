"""
Scout API — FastAPI entry point.
Handles the Scout intelligence pipeline + permit data ingestion.
Chat and notify endpoints live in the Next.js frontend (app/api/).
"""
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.scout import router as scout_router
from routes.permits import router as permits_router

app = FastAPI(title="Scout API", version="2.0")

# Allow the Next.js frontend (Vercel) + local dev
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://*.vercel.app",
    # Add your specific Vercel URL here once deployed:
    # "https://buildmapper.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to ALLOWED_ORIGINS after first deploy
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scout_router)
app.include_router(permits_router)


@app.get("/")
def health():
    return {"status": "ok", "service": "scout-api", "version": "2.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
