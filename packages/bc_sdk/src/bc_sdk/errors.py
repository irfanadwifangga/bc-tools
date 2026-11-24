class BCError(Exception):
    """Base error for Business Central SDK operations."""


class BCAuthError(BCError):
    """The SDK could not acquire credentials for an API request."""
