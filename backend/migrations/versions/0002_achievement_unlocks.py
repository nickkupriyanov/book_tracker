"""achievement unlocks schema

Revision ID: 0002_achievement_unlocks
Revises: 0001_baseline
Create Date: 2026-06-10

Additive migration: introduces the per-user achievement unlock
table. No book or challenge data is touched; the unique
constraint on `(user_id, achievement_id)` is the source of
truth for idempotent save behaviour.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_achievement_unlocks"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "achievement_unlocks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("achievement_id", sa.String(length=64), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "user_id",
            "achievement_id",
            name="achievement_unlocks_user_id_achievement_id_key",
        ),
    )
    op.create_index(
        "ix_achievement_unlocks_user_id",
        "achievement_unlocks",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_achievement_unlocks_user_id", table_name="achievement_unlocks")
    op.drop_table("achievement_unlocks")
