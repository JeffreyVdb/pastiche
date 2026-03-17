from fastapi import APIRouter

from app.api.routes import auth, health, keys, snippets

router = APIRouter(prefix="/api")
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(snippets.router)
router.include_router(keys.router)
