"""Books CRUD routes — authenticated, user-scoped."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.book import BookCreateRequest, BookUpdateRequest
from app.services.books import (
    add_book_for_user,
    delete_book_for_user,
    list_books_for_user,
    update_book_for_user,
)

router = APIRouter(prefix="/books", tags=["books"])


@router.get("")
def list_books(current_user: CurrentUser, db: DbSession) -> list[dict[str, Any]]:
    return list_books_for_user(db, current_user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
def add_book(
    payload: BookCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, Any]:
    try:
        return add_book_for_user(db, current_user.id, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.put("/{book_id}")
def update_book(
    book_id: str,
    payload: BookUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, Any]:
    updated = update_book_for_user(db, current_user.id, book_id, payload.model_dump())
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"book {book_id!r} not found",
        )
    return updated


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_book(
    book_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    deleted = delete_book_for_user(db, current_user.id, book_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"book {book_id!r} not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
