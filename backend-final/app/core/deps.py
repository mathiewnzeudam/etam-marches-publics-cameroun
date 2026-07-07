"""Dépendances injectées dans les endpoints FastAPI."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_token
from app.db.session import async_session_factory

bearer = HTTPBearer()


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )
    from app.services.services import UserService
    user = await UserService(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou désactivé",
        )
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
):
    """Utilisateur optionnel — endpoints publics qui s'enrichissent si connecté."""
    if not credentials:
        return None
    user_id = decode_token(credentials.credentials)
    if not user_id:
        return None
    from app.services.services import UserService
    return await UserService(db).get_by_id(user_id)


def require_role(*allowed_roles: str):
    """Dépendance FastAPI : restreint un endpoint aux utilisateurs ayant l'un des rôles donnés.

    S'appuie sur get_current_user (déjà authentifié) — à utiliser en plus, pas à la place.
    """
    async def _dependency(current_user=Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès réservé à un rôle non autorisé pour ce compte",
            )
        return current_user

    return _dependency
