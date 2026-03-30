"""
Scout API — standalone FastAPI entry point.
Serves the Scout intelligence pipeline + permit data ingestion.
"""
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.scout import router as scout_router
from routes.permits import router as permits_router

app = FastAPI(title="Scout API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
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
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
