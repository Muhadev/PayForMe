from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '92747833e318'
down_revision = '82cc097cd804'
branch_labels = None
depends_on = None


def upgrade():
    # First drop the foreign key constraints
    with op.batch_alter_table('project_roles', schema=None) as batch_op:
        batch_op.drop_constraint('project_roles_ibfk_2', type_='foreignkey')
        batch_op.drop_constraint('project_roles_ibfk_1', type_='foreignkey')
        
        # Now drop the index
        batch_op.drop_index('unique_user_project_role')
        
        # Re-add the foreign key constraints
        batch_op.create_foreign_key('project_roles_ibfk_1', 'projects', ['project_id'], ['id'])
        batch_op.create_foreign_key('project_roles_ibfk_2', 'users', ['user_id'], ['id'])

def downgrade():
    with op.batch_alter_table('project_roles', schema=None) as batch_op:
        batch_op.create_index('unique_user_project_role', ['user_id', 'project_id', 'role'], unique=True)

    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index('ix_notifications_user_id', ['user_id'], unique=False)