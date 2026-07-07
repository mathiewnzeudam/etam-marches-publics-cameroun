"""Rate-limiting simple basé sur Redis (fenêtre fixe), réutilisant la connexion de rag_service."""
from fastapi import HTTPException, Request, status


def rate_limit(key_prefix: str, max_requests: int, window_seconds: int):
    """Retourne une dépendance FastAPI qui limite à `max_requests` par `window_seconds`,
    par adresse IP. Fail-open si Redis est indisponible (ne bloque jamais un client
    légitime à cause d'une panne d'infra annexe)."""

    async def _dependency(request: Request):
        from app.services.services import rag_service
        redis = rag_service._redis
        if redis is None:
            return
        ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{key_prefix}:{ip}"
        try:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window_seconds)
            if count > max_requests:
                ttl = await redis.ttl(key)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Trop de requêtes. Réessayez dans {max(ttl, 1)} secondes.",
                )
        except HTTPException:
            raise
        except Exception:
            return

    return _dependency
