"""baseline schema

Revision ID: 0001_baseline
Revises:
Create Date: 2026-06-09

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "books",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "book_created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_books_user_id", "books", ["user_id"], unique=False
    )
    op.create_index(
        "ix_books_user_id_updated_at",
        "books",
        ["user_id", "updated_at"],
        unique=False,
    )

    op.create_table(
        "annual_reading_challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("target_books", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "user_id",
            "year",
            name="annual_reading_challenges_user_id_year_key",
        ),
        sa.CheckConstraint(
            "target_books >= 1", name="ck_annual_reading_challenges_target_books"
        ),
        sa.CheckConstraint(
            "year >= 1900 AND year <= 9999",
            name="ck_annual_reading_challenges_year_four_digit",
        ),
    )


def downgrade() -> None:
    op.drop_table("annual_reading_challenges")
    op.drop_index("ix_books_user_id_updated_at", table_name="books")
    op.drop_index("ix_books_user_id", table_name="books")
    op.drop_table("books")
    op.drop_table("users")
