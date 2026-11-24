class BCError(Exception):
    """Base error for Business Central SDK operations."""


class BCAuthError(BCError):
    """The SDK could not acquire credentials for an API request."""


class BCNotFoundError(BCError):
    """The requested Business Central resource was not found."""


class BCRateLimitError(BCError):
    """Business Central throttled the request."""


class BCServerError(BCError):
    """Business Central could not complete the request."""


class BCRequestError(BCError):
    """The request or response could not be processed safely."""
