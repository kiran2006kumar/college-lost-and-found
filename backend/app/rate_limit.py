from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status

_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def auth_rate_limit(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    key = f"{request.url.path}:{client}"
    now = monotonic()
    with _lock:
        recent = _requests[key]
        while recent and now - recent[0] > 60:
            recent.popleft()
        if len(recent) >= 10:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Try again shortly.")
        recent.append(now)
