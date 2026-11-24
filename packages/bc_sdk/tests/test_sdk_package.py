import bc_sdk


def test_sdk_package_is_importable() -> None:
    assert bc_sdk.__name__ == "bc_sdk"
