"""
A2UI bridge — generates the system prompt and validates generations using the
A2UI project's OWN Python SDK (a2ui-project/a2ui, agent_sdks/python).

This is deliberately a thin shell: everything substantive (prompt text, parsing,
schema validation) comes from their code, not ours.

  python a2ui_tool.py prompt                 -> writes the system prompt to stdout
  python a2ui_tool.py validate <file.jsonl>  -> one JSON verdict per line, per record
"""

import json
import sys

from a2ui.inference_formats.transport.format import TransportFormat
from a2ui.schema.catalog import CatalogConfig, FileSystemCatalogProvider

SPEC = "/tmp/a2ui-src/specification/v0_9/catalogs/basic"
ROLE = (
    "You are a UI generation assistant. Given a user request, respond with A2UI "
    "messages that render the requested interface."
)


def build_format() -> TransportFormat:
    cfg = CatalogConfig(
        name="basic",
        provider=FileSystemCatalogProvider(f"{SPEC}/catalog.json"),
        examples_path=f"{SPEC}/examples",
    )
    return TransportFormat(version="0.9", catalogs=[cfg])


def make_prompt() -> str:
    # include_schema=True gives the model the component/message schemas — without
    # it the prompt is 213 tokens and describes nothing. include_examples=False:
    # examples add ~39k tokens, which would make this prompt 4x any other in the
    # benchmark. Disclosed in the report.
    return build_format().prompt_generator.generate(
        role_description=ROLE, include_schema=True, include_examples=False
    )


def validate(output: str, fmt: TransportFormat) -> dict:
    """Validate one generation with A2UI's own parser."""
    parser = fmt.parser
    try:
        if not parser.has_format_content(output):
            return {"ok": False, "kind": "no-structured-output",
                    "message": "no <a2ui-json> block in the response"}
        parts = parser.parse_response(output)
    except Exception as exc:  # their parser raises on malformed payloads
        return {"ok": False, "kind": "parse-error", "message": f"{type(exc).__name__}: {exc}"[:300]}

    messages, components = [], 0
    for part in parts:
        data = getattr(part, "a2ui_json", None)
        if data is None:
            continue
        for msg in data if isinstance(data, list) else [data]:
            if not isinstance(msg, dict):
                continue
            messages.append(msg)
            uc = msg.get("updateComponents")
            if isinstance(uc, dict) and isinstance(uc.get("components"), list):
                components += len(uc["components"])

    if not messages:
        return {"ok": False, "kind": "no-structured-output",
                "message": "block parsed but contained no A2UI messages"}
    if components == 0:
        return {"ok": False, "kind": "schema-error",
                "message": "no updateComponents message with components"}

    # Structural fingerprint: the component type of each entry, in order.
    # v0.9 nests the type as the single key of `component.componentProperties`.
    shape = []
    for msg in messages:
        uc = msg.get("updateComponents")
        if not isinstance(uc, dict):
            continue
        for c in uc.get("components", []):
            if not isinstance(c, dict):
                continue
            comp = c.get("component")
            if isinstance(comp, str):
                # flat form: {"component": "Text"}
                shape.append(comp)
                continue
            props = comp.get("componentProperties") if isinstance(comp, dict) else None
            shape.append(next(iter(props), "?") if isinstance(props, dict) else "?")

    return {"ok": True, "kind": None, "message": "", "components": components,
            "shape": ",".join(shape)}


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    if sys.argv[1] == "prompt":
        sys.stdout.write(make_prompt())
        return 0
    if sys.argv[1] == "validate":
        fmt = build_format()
        with open(sys.argv[2], encoding="utf-8") as fh:
            for line in fh:
                if not line.strip():
                    continue
                rec = json.loads(line)
                print(json.dumps(validate(rec.get("output", ""), fmt)))
        return 0
    print(f"unknown command: {sys.argv[1]}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
