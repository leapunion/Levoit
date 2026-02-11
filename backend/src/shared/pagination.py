"""Generic pagination utilities."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")

    @property
    def total_pages(self) -> int:
        return (self.total + self.page_size - 1) // self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T] = Field(..., description="Page of results")
    meta: PaginationMeta = Field(..., description="Pagination metadata")


def paginate(items: list[T], total: int, page: int = 1, page_size: int = 20) -> PaginatedResponse[T]:
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(total=total, page=page, page_size=page_size),
    )
