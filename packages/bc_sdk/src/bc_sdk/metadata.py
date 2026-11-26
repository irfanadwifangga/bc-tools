"""Catalog of entity sets in Sandbox service metadata."""

from collections.abc import Awaitable, Callable
from xml.etree import ElementTree as ET

from pydantic import BaseModel

from .errors import BCRequestError

_EDMX = "{http://docs.oasis-open.org/odata/ns/edmx}"
_EDM = "{http://docs.oasis-open.org/odata/ns/edm}"


class MetadataField(BaseModel):
    name: str
    type: str


class MetadataEntity(BaseModel):
    name: str
    entity_type: str
    fields: list[MetadataField]


class _MetadataTree(ET.TreeBuilder):
    def doctype(self, name: str, pubid: str | None, system: str | None) -> None:
        raise BCRequestError("DTD declarations are not supported in metadata.")


def _catalog(document: bytes) -> list[MetadataEntity]:
    try:
        root = ET.fromstring(document, parser=ET.XMLParser(target=_MetadataTree()))
    except ET.ParseError:
        raise BCRequestError(
            "Business Central returned invalid metadata XML."
        ) from None

    schemas = root.findall(f"{_EDMX}DataServices/{_EDM}Schema")
    containers = [
        node for schema in schemas for node in schema.findall(f"{_EDM}EntityContainer")
    ]
    if root.tag != f"{_EDMX}Edmx" or len(containers) != 1:
        raise BCRequestError("Expected one entity container in metadata.")

    types: dict[str, ET.Element] = {}
    aliases: dict[str, str] = {}

    def qualified(reference: str) -> str:
        prefix, _, name = reference.rpartition(".")
        return f"{aliases.get(prefix, prefix)}.{name}"

    try:
        for schema in schemas:
            namespace = schema.attrib["Namespace"]
            if alias := schema.get("Alias"):
                aliases[alias] = namespace
            for entity in schema.findall(f"{_EDM}EntityType"):
                types[f"{namespace}.{entity.attrib['Name']}"] = entity

        result = []
        for entity_set in containers[0].findall(f"{_EDM}EntitySet"):
            entity_type = qualified(entity_set.attrib["EntityType"])
            lineage: list[ET.Element] = []
            current = entity_type
            while current:
                node = types[current]
                if node in lineage:
                    raise BCRequestError("Cyclic entity type inheritance in metadata.")
                lineage.append(node)
                base = node.get("BaseType")
                current = qualified(base) if base else ""
            fields = [
                MetadataField(name=prop.attrib["Name"], type=prop.attrib["Type"])
                for ancestor in reversed(lineage)
                for prop in ancestor.findall(f"{_EDM}Property")
            ]
            result.append(
                MetadataEntity(
                    name=entity_set.attrib["Name"],
                    entity_type=entity_type,
                    fields=fields,
                )
            )
        return result
    except KeyError:
        raise BCRequestError(
            "Invalid entity or field definition in metadata."
        ) from None


class Metadata:
    def __init__(self, read: Callable[[], Awaitable[bytes]]) -> None:
        self._read = read

    async def list_entities(self) -> list[MetadataEntity]:
        """Return entity set names, qualified entity types and structural fields."""
        return _catalog(await self._read())
