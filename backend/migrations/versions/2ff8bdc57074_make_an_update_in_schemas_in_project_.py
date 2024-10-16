"""make an update in schemas in project model

Revision ID: 2ff8bdc57074
Revises: 4c86b601e842
Create Date: 2024-10-14 13:06:12.956850

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '2ff8bdc57074'
down_revision = '4c86b601e842'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.alter_column('current_amount',
               existing_type=mysql.FLOAT(),
               type_=sa.Numeric(precision=10, scale=2),
               existing_nullable=True)
        batch_op.alter_column('goal_amount',
               existing_type=mysql.FLOAT(),
               type_=sa.Numeric(precision=10, scale=2),
               nullable=True)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.alter_column('goal_amount',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=mysql.FLOAT(),
               nullable=False)
        batch_op.alter_column('current_amount',
               existing_type=sa.Numeric(precision=10, scale=2),
               type_=mysql.FLOAT(),
               existing_nullable=True)

    # ### end Alembic commands ###