from collections.abc import Callable
from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError

from app.database import SessionLocal
from app.models import Role, User
from app.security import hash_password

_email_adapter = TypeAdapter(EmailStr)


def is_valid_email(v: str) -> str | None:
    try:
        _email_adapter.validate_python(v)
        return None
    except ValidationError:
        return "Email is invalid"


def min_length(n: int) -> Callable[[str], str | None]:
    def check(v: str) -> str | None:
        if len(v) < n:
            return f"Must be at least {n} characters"
        return None

    return check


def passwords_matching(password: str) -> Callable[[str], str | None]:
    def check(other: str) -> str | None:
        if password != other:
            return "Passwords do not match"
        return None

    return check


def get_or_retry(
    field: str,
    reader: Callable[[str], str],
    validate: Callable[[str], str | None] | None = None,
) -> str:
    RETRIES = 3

    for _ in range(RETRIES):
        v = reader(f"{field}: ")

        if v.strip() == "":
            print(f"{field} is required")
            continue

        if validate:
            error = validate(v)
            if error:
                print(error)
                continue

        return v

    raise ValueError("Max retries reached.")


def main():
    db = SessionLocal()
    print("Creating admin for Compliance Document Review App...")

    try:
        name = get_or_retry("Name", input, validate=min_length(2))
        email = get_or_retry("Email", input, validate=is_valid_email).lower()
        password = get_or_retry("Password", getpass, validate=min_length(8))
        get_or_retry("Confirm Password", getpass, validate=passwords_matching(password))

        db.add(User(name=name, email=email, password_hash=hash_password(password), role=Role.admin))
        db.commit()

        print(f"Successfully created admin: {name} <{email}>")
    except Exception as e:
        print(f"Failed to create admin: {e}. Please try again.")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
