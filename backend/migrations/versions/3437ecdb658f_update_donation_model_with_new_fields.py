"""Update donation model with new fields

Revision ID: 3437ecdb658f
Revises: a15477761787
Create Date: 2024-12-02 21:09:03.421537

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '3437ecdb658f'
down_revision = 'a15477761787'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('donations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('payment_session_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('payment_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('completed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('failure_reason', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('failed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('refunded_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('refund_amount', sa.Float(), nullable=True))
        batch_op.drop_index('uq_donation_idempotency')
        batch_op.create_unique_constraint(None, ['payment_id'])
        batch_op.create_unique_constraint(None, ['payment_session_id'])
        batch_op.drop_column('gift_aid')
        batch_op.drop_column('anonymous')
        batch_op.drop_column('recurring')
        batch_op.drop_column('idempotency_key')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('donations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('idempotency_key', mysql.VARCHAR(length=64), nullable=True))
        batch_op.add_column(sa.Column('recurring', mysql.TINYINT(display_width=1), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('anonymous', mysql.TINYINT(display_width=1), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('gift_aid', mysql.TINYINT(display_width=1), autoincrement=False, nullable=True))
        batch_op.drop_constraint(None, type_='unique')
        batch_op.drop_constraint(None, type_='unique')
        batch_op.create_index('uq_donation_idempotency', ['user_id', 'project_id', 'amount', 'idempotency_key'], unique=True)
        batch_op.drop_column('refund_amount')
        batch_op.drop_column('refunded_at')
        batch_op.drop_column('failed_at')
        batch_op.drop_column('failure_reason')
        batch_op.drop_column('completed_at')
        batch_op.drop_column('payment_id')
        batch_op.drop_column('payment_session_id')

    # ### end Alembic commands ###