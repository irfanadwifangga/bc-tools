from collections.abc import AsyncIterator, Callable, Sequence
from enum import StrEnum
from uuid import UUID

import httpx
from pydantic import BaseModel, ValidationError

from .errors import BCRequestError
from .models import Company

type _RecordReader = Callable[
    [str, httpx.QueryParams | None], AsyncIterator[dict[str, object]]
]
type _PageReader = Callable[
    [str, httpx.QueryParams | None],
    AsyncIterator[tuple[list[dict[str, object]], int | None]],
]

MAX_RECORD_NUMBER_LENGTH = 100
MAX_RECORD_NAME_LENGTH = MAX_RECORD_NUMBER_LENGTH


def is_valid_record_number(number: str) -> bool:
    return (
        isinstance(number, str)
        and len(number) <= MAX_RECORD_NUMBER_LENGTH
        and bool(number.strip())
        and number.isprintable()
    )


is_valid_record_name = is_valid_record_number


class RecordOrder(StrEnum):
    NUMBER_ASC = "number asc"
    NUMBER_DESC = "number desc"
    NAME_ASC = "displayName asc"
    NAME_DESC = "displayName desc"


class RecordField(StrEnum):
    ID = "id"
    NUMBER = "number"
    DISPLAY_NAME = "displayName"


DEFAULT_RECORD_FIELDS = (RecordField.ID, RecordField.NUMBER, RecordField.DISPLAY_NAME)


def parse_record_fields(raw: str) -> tuple[RecordField, ...]:
    """Parse a comma-separated list of distinct preview fields."""
    parts = raw.split(",")
    if not raw or any(not part for part in parts):
        raise ValueError("Invalid select fields.")
    fields = tuple(RecordField(part) for part in parts)
    if len(set(fields)) != len(fields):
        raise ValueError("Duplicate select fields.")
    return fields


async def _list_records[Record: BaseModel](
    reader: _RecordReader | None,
    page_reader: _PageReader | None,
    path: str,
    model: type[Record],
    fields: str,
    top: int | None,
    order_by: RecordOrder | None = None,
    number: str | None = None,
    name: str | None = None,
    required_fields: tuple[str, ...] = (),
    include_count: bool = False,
) -> tuple[list[Record], int | None]:
    query: dict[str, str | int] = {"$select": fields}
    if top is not None:
        if isinstance(top, bool) or not isinstance(top, int) or top < 1:
            raise BCRequestError("The top option must be a positive integer.")
        query["$top"] = top
    if order_by is not None:
        if not isinstance(order_by, RecordOrder):
            raise BCRequestError("Unsupported record order.")
        query["$orderby"] = order_by.value
    filters: list[str] = []
    if number is not None:
        if not is_valid_record_number(number):
            raise BCRequestError("Invalid record number.")
        filters.append(f"number eq '{number.replace("'", "''")}'")
    if name is not None:
        if not is_valid_record_name(name):
            raise BCRequestError("Invalid record name.")
        filters.append(f"contains(displayName,'{name.replace("'", "''")}')")
    if filters:
        query["$filter"] = " and ".join(filters)
    if not isinstance(include_count, bool):
        raise BCRequestError("Invalid include_count option.")
    if include_count:
        query["$count"] = "true"

    params = httpx.QueryParams(query)
    total_count: int | None = None
    results: list[Record] = []

    def _validate_row(row: dict[str, object]) -> Record:
        if any(row.get(key) is None for key in required_fields):
            raise BCRequestError(
                "Business Central returned an invalid resource record."
            )
        try:
            return model.model_validate(row)
        except ValidationError:
            raise BCRequestError(
                "Business Central returned an invalid resource record."
            ) from None

    if page_reader is not None:
        async for page_rows, page_count in page_reader(path, params):
            if include_count and total_count is None and page_count is not None:
                total_count = page_count
            for row in page_rows:
                results.append(_validate_row(row))
                if top is not None and len(results) == top:
                    return results, total_count
        return results, total_count

    if include_count or reader is None:
        raise BCRequestError("Page reader is required to read count.")

    async for row in reader(path, params):
        results.append(_validate_row(row))
        if top is not None and len(results) == top:
            break
    return results, None


class Companies:
    """List companies in the configured Sandbox."""

    def __init__(self, reader: _RecordReader) -> None:
        self._reader = reader

    async def list(self, *, top: int | None = None) -> list[Company]:
        records, _ = await _list_records(
            self._reader, None, "companies", Company, "id,name,displayName", top
        )
        return records


class CompanyResource[Record: BaseModel]:
    """List records in the configured demo company."""

    def __init__(
        self,
        reader: _RecordReader,
        company_id: UUID | None,
        entity: str,
        model: type[Record],
        page_reader: _PageReader | None = None,
    ) -> None:
        self._reader = reader
        self._company_id = company_id
        self._entity = entity
        self._model = model
        self._page_reader = page_reader

    async def list_page(
        self,
        *,
        company_id: UUID | str | None = None,
        top: int | None = None,
        order_by: RecordOrder | None = None,
        number: str | None = None,
        name: str | None = None,
        fields: Sequence[RecordField] | None = None,
        include_count: bool = False,
    ) -> tuple[list[Record], int | None]:
        """List records along with an optional @odata.count total."""
        if self._company_id is None:
            raise BCRequestError(
                "Configure the demo company ID before reading company data."
            )

        selected = tuple(fields) if fields is not None else DEFAULT_RECORD_FIELDS
        if (
            not selected
            or any(not isinstance(field, RecordField) for field in selected)
            or len(set(selected)) != len(selected)
        ):
            raise BCRequestError("Unsupported record fields.")

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
            self._page_reader,
            path,
            self._model,
            ",".join(field.value for field in selected),
            top,
            order_by,
            number,
            name,
            tuple(field.value for field in selected),
            include_count,
        )

    async def list(
        self,
        *,
        company_id: UUID | str | None = None,
        top: int | None = None,
        order_by: RecordOrder | None = None,
        number: str | None = None,
        name: str | None = None,
        fields: Sequence[RecordField] | None = None,
    ) -> list[Record]:
        records, _ = await self.list_page(
            company_id=company_id,
            top=top,
            order_by=order_by,
            number=number,
            name=name,
            fields=fields,
            include_count=False,
        )
        return records
