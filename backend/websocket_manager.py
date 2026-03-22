from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import WebSocket

logger = logging.getLogger("flare.ws")


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)
        logger.info(f"WS connected. Total: {len(self._connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        try:
            self._connections.remove(websocket)
        except ValueError:
            pass
        logger.info(f"WS disconnected. Total: {len(self._connections)}")

    async def broadcast(self, message: Dict[str, Any]) -> None:
        dead: List[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self._connections.remove(ws)
            except ValueError:
                pass

    @property
    def connection_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()
