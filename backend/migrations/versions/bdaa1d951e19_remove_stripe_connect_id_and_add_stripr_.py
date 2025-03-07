"""Remove stripe_connect_id and add stripr_customer_id in user model

Revision ID: bdaa1d951e19
Revises: 55a9032dcc66
Create Date: 2025-02-28 02:29:29.051203

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bdaa1d951e19'
down_revision = '55a9032dcc66'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    # with op.batch_alter_table('notifications', schema=None) as batch_op:
    #     batch_op.drop_index('ix_notifications_user_id')

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('funds_available', sa.Boolean(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('funds_available')

    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index('ix_notifications_user_id', ['user_id'], unique=False)

    # ### end Alembic commands ###
