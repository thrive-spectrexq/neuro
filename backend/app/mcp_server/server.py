from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

from app.mcp_server.tools import (
    MCP_TOOLS_DEFINITIONS,
    handle_create_note,
    handle_execute_system_command,
    handle_get_graph,
    handle_get_prerequisite_path,
    handle_get_system_status,
    handle_generate_roadmap,
    handle_search_notes,
)

SERVER_NAME = "neuro-mcp"
SERVER_VERSION = "0.1.1"
PROTOCOL_VERSION = "2024-11-05"


async def process_jsonrpc_request(request: dict[str, Any]) -> dict[str, Any] | None:
    req_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})

    # Handle notifications (e.g. notifications/initialized) where id is None
    if method == "notifications/initialized":
        return None

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {},
                    "prompts": {},
                },
                "serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION,
                },
            },
        }

    if method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS_DEFINITIONS,
            },
        }

    if method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        try:
            if tool_name == "neuro_search_notes":
                result_text = await handle_search_notes(arguments)
            elif tool_name == "neuro_get_graph":
                result_text = await handle_get_graph(arguments)
            elif tool_name == "neuro_get_prerequisite_path":
                result_text = await handle_get_prerequisite_path(arguments)
            elif tool_name == "neuro_generate_roadmap":
                result_text = await handle_generate_roadmap(arguments)
            elif tool_name == "neuro_create_note":
                result_text = await handle_create_note(arguments)
            elif tool_name == "neuro_execute_system_command":
                result_text = await handle_execute_system_command(arguments)
            elif tool_name == "neuro_get_system_status":
                result_text = await handle_get_system_status(arguments)
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
                }

            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": result_text}],
                    "isError": False,
                },
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error executing {tool_name}: {str(e)}"}],
                    "isError": True,
                },
            }

    # Fallback for unrecognized methods
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


async def run_stdio_server():
    """Runs the asynchronous MCP stdio JSON-RPC server loop."""
    loop = asyncio.get_running_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        try:
            line = await reader.readline()
            if not line:
                break

            line_str = line.decode("utf-8").strip()
            if not line_str:
                continue

            try:
                payload = json.loads(line_str)
            except json.JSONDecodeError:
                continue

            response = await process_jsonrpc_request(payload)
            if response is not None:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
        except asyncio.CancelledError:
            break
        except Exception as err:
            sys.stderr.write(f"[Neuro-MCP Error] {err}\n")
            sys.stderr.flush()


def main():
    try:
        asyncio.run(run_stdio_server())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
