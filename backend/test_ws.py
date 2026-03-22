import asyncio
import httpx
import websockets
import json

async def test_ws():
    async with websockets.connect("ws://localhost:8000/ws/test1234") as websocket:
        print("Connected to WS.")
        
        # Trigger an event
        async with httpx.AsyncClient() as client:
            resp = await client.post("http://localhost:8000/events", json={
                "student_id": "STU001",
                "event_type": "grade_drop",
                "payload": {
                    "course_id": "c101",
                    "new_grade": 45
                }
            })
            print("POST /events response:", resp.json())
        
        # Wait for WS message
        msg = await websocket.recv()
        print("Received WS message:", json.loads(msg))

if __name__ == "__main__":
    asyncio.run(test_ws())
