"""initial_schema

Revision ID: 24bc08a86aa7
Revises:
Create Date: 2026-07-23 17:14:52.536783

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "24bc08a86aa7"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Ensure SQLModel metadata tables exist
    bind = op.get_bind()
    sqlmodel.SQLModel.metadata.create_all(bind)


def downgrade() -> None:
    pass
