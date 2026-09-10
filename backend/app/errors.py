# Error sentinels, and handling related-functions.
#
# TODO: Define error sentinels here


def error_detail(
    message: str,
    field: str | None = None,
) -> dict:
    return {
        "message": message,
        "field": field,
    }
