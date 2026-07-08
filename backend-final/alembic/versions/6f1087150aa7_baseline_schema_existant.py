"""baseline - schema existant

Revision ID: 6f1087150aa7
Revises: 
Create Date: 2026-07-08 23:43:29.799938

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6f1087150aa7'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migration de référence : marque le schéma existant (créé via les scripts SQL
    # bruts historiques database/migrations/000-006_*.sql) comme point de départ pour
    # Alembic, sans rien modifier. Les futures évolutions de schéma passeront par
    # "alembic revision --autogenerate" à partir d'ici.
    pass


def downgrade() -> None:
    pass
