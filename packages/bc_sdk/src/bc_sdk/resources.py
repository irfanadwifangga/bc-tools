from collections.abc import AsyncIterator, Callable
from enum import StrEnum
from uuid import UUID

import httpx
from pydantic import BaseModel, ValidationError

from .errors import BCRequestError
from .models import Company

type _RecordReader = Callable[
    [str, httpx.QueryParams | None], AsyncIterator[dict[str, object]]
]

MAX_RECORD_NUMBER_LENGTH = 100


def is_valid_record_number(number: str) -> bool:
    return (
        isinstance(number, str)
        and len(number) <= MAX_RECORD_NUMBER_LENGTH
        and bool(number.strip())
        and number.isprintable()
    )


class RecordOrder(StrEnum):
    NUMBER_ASC = "number asc"
    NUMBER_DESC = "number desc"
    NAME_ASC = "displayName asc"
    NAME_DESC = "displayName desc"


async def _list_records[Record: BaseModel](
    reader: _RecordReader,
    path: str,
    model: type[Record],
    fields: str,
    top: int | None,
    order_by: RecordOrder | None = None,
    number: str | None = None,
) -> list[Record]:
    query: dict[str, str | int] = {"$select": fields}
    if top is not None:
        if isinstance(top, bool) or not isinstance(top, int) or top < 1:
            raise BCRequestError("The top option must be a positive integer.")
        query["$top"] = top
    if order_by is not None:
        if not isinstance(order_by, RecordOrder):
            raise BCRequestError("Unsupported record order.")
        query["$orderby"] = order_by.value
    if number is not None:
        if not is_valid_record_number(number):
            raise BCRequestError("Invalid record number.")
        escaped = number.replace("'", "''")
        query["$filter"] = f"number eq '{escaped}'"

    results: list[Record] = []
    async for row in reader(path, httpx.QueryParams(query)):
        try:
            results.append(model.model_validate(row))
        except ValidationError:
            raise BCRequestError(
                "Business Central returned an invalid resource record."
            ) from None
        if top is not None and len(results) == top:
            break
    return results


class Companies:
    """List companies in the configured Sandbox."""

    def __init__(self, reader: _RecordReader) -> None:
        self._reader = reader

    async def list(self, *, top: int | None = None) -> list[Company]:
        return await _list_records(
            self._reader, "companies", Company, "id,name,displayName", top
        )


class CompanyResource[Record: BaseModel]:
    """List records in the configured demo company."""

    def __init__(
        self,
        reader: _RecordReader,
        company_id: UUID | None,
        entity: str,
        model: type[Record],
    ) -> None:
        self._reader = reader
        self._company_id = company_id
        self._entity = entity
        self._model = model

    async def list(
        self,
        *,
        company_id: UUID | str | None = None,
        top: int | None = None,
        order_by: RecordOrder | None = None,
        number: str | None = None,
    ) -> list[Record]:
        if self._company_id is None:
            raise BCRequestError(
                "Configure the demo company ID before reading company data."
            )

        try:
            requested = UUID(company_id) if isinstance(company_id, str) else company_id
        except ValueError:
            raise BCRequestError("The company ID must be a UUID.") from None
        if requested is not None and requested != self._company_id:
            raise BCRequestError(
                "The requested company is outside the configured scope."
            )

        path = f"companies({self._company_id})/{self._entity}"
        return await _list_records(
            self._reader,
            path,
            self._model,
            "id,number,displayName",
            top,
            order_by,
            number,
        )
