"""Restore native role enum with admin

Revision ID: 8059e8185ea7
Revises: 7462e71b9b49
Create Date: 2026-09-20 23:09:01.175040

"""

from typing import Sequence, Union

import pgvector.sqlalchemy
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8059e8185ea7"
down_revision: Union[str, Sequence[str], None] = "7462e71b9b49"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE role ADD VALUE IF NOT EXISTS 'admin'")

    op.alter_column(
        "users",
        "role",
        type_=postgresql.ENUM("advisor", "officer", "admin", name="role", create_type=False),
        existing_type=sa.String(length=20),
        existing_nullable=False,
        postgresql_using="role::role",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "users",
        "role",
        type_=sa.String(length=20),
        existing_type=postgresql.ENUM(
            "advisor", "officer", "admin", name="role", create_type=False
        ),
        existing_nullable=False,
    )
