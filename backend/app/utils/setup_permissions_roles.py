# app/utils/setup_permissions_roles.py

import os
import sys
from datetime import datetime

# Add the parent directory of 'app' to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app import create_app, db
from flask import current_app
from app.models.permission import Permission
from app.models import Permission, Role, User

def setup_permissions_and_roles():
    app = create_app()
    with app.app_context():
        try:
            # Create or update permissions
            permissions = [
                ('create_category', 'Can create new categories'),
                ('view_category', 'Can view a specific category'),
                ('view_categories', 'Can view all categories'),
                ('edit_category', 'Can edit existing categories'),
                ('delete_category', 'Can delete categories'),
                ('create_project', 'Can create new projects'),
                ('view_projects', 'Can view all projects'),
                ('edit_own_project', 'Can edit own projects'),
                ('delete_own_project', 'Can delete own projects'),
                ('edit_any_project', 'Can edit any project'),
                ('delete_any_project', 'Can delete any project'),
                ('create_draft', 'Can create draft projects'),
                ('view_drafts', 'Can view draft projects'),
                ('edit_draft', 'Can edit draft projects'),
                ('assign_role', 'Can assign roles to users'),
                ('revoke_role', 'Can revoke roles from users'),
                ('view_permissions', 'Can view user permissions'),
                ('initiate_2fa_setup', 'Can initiate 2FA setup'),
                ('complete_2fa_setup', 'Can complete 2FA setup'),
                ('verify_2fa', 'Can verify 2FA'),
                ('revoke_2fa', 'Can revoke 2FA'),
                ('back_project', 'Can back a project'),
                ('activate_project', 'Can activate pending projects'),  # Add this line
                ('view_backers', 'Can view backers of a project'),
                ('view_user_backed_projects', 'Can view the projects a user backed'),
                ('view_backer_details', 'Can view details of a project backer'),
                ('view_backer_stats', 'Can view backer statistics of a project'),
                ('send_project_update', 'Can send project updates to backers'),
                ('send_project_milestone', 'Can send milestone updates to backers'),
                ('view_public_profile', 'Can view public profiles'),
                ('create_reward', 'Can create rewards for a project'),
                ('view_rewards', 'Can view rewards for a project'),
                ('list_rewards', 'Can list all rewards for a project'),
                ('get_reward', 'Can view a specific reward'),
                ('update_reward', 'Can update rewards for a project'),  # Fixed capitalization
                ('delete_reward', 'Can delete rewards for a project'),
                ('claim_reward', 'Can claim a reward'),
                ('view_pending_projects', 'Can view projects pending approval'),
                ('edit_project', 'Can edit any project'),
                ('delete_project', 'Can delete any project'),
                ('share_project', 'Can share projects on social media'),
                ('view_users', 'Can view list of all users'),

            ]

            for name, description in permissions:
                permission = Permission.query.filter_by(name=name).first()
                if permission is None:
                    permission = Permission(name=name, description=description)
                    db.session.add(permission)
                    current_app.logger.info(f"Created permission: {name}")
                else:
                    permission.description = description
                    current_app.logger.info(f"Updated permission: {name}")

            # Create or update roles
            roles = [
                ('Admin', 'Administrator with all permissions', None),
                ('User', 'Regular user with project management capabilities', [
                    'view_category', 'view_categories', 'view_projects',
                    'create_project', 'edit_own_project', 'delete_own_project',
                    'create_draft', 'view_drafts', 'edit_draft',
                    'initiate_2fa_setup', 'complete_2fa_setup', 'verify_2fa', 'revoke_2fa',
                    'back_project', 'view_user_backed_projects', 'view_backers', 'view_backer_details',
                    'send_project_update', 'send_project_milestone',
                    'view_public_profile','create_reward',
                    'view_rewards',
                    'list_rewards',
                    'get_reward',
                    'update_reward',
                    'claim_reward',
                    'delete_reward',
                    'share_project',
                ])
            ]

            for role_name, description, permission_names in roles:
                role = Role.query.filter_by(name=role_name).first()
                if role is None:
                    role = Role(name=role_name, description=description)
                    db.session.add(role)
                    current_app.logger.info(f"Created role: {role_name}")
                else:
                    role.description = description
                    current_app.logger.info(f"Updated role: {role_name}")

                if permission_names is None:
                    # Admin role gets all permissions
                    role.permissions = Permission.query.all()
                else:
                    role.permissions = Permission.query.filter(Permission.name.in_(permission_names)).all()

            # Remove the 'Project Manager' role if it exists
            project_manager_role = Role.query.filter_by(name='Project Manager').first()
            if project_manager_role:
                # Reassign users with 'Project Manager' role to 'User' role
                user_role = Role.query.filter_by(name='User').first()
                for user in User.query.filter(User.roles.contains(project_manager_role)):
                    if user_role not in user.roles:
                        user.roles.append(user_role)
                    user.roles.remove(project_manager_role)
                db.session.delete(project_manager_role)
                current_app.logger.info("Removed 'Project Manager' role and reassigned users")

            # Update existing users
            user_role = Role.query.filter_by(name='User').first()
            if user_role:
                users = User.query.all()
                for user in users:
                    if user_role not in user.roles:
                        user.roles.append(user_role)
                current_app.logger.info("Updated existing users with new permissions")

            # Update last_permission_update for all users
            User.query.update({User.last_permission_update: datetime.utcnow()})
            current_app.logger.info("Updated last_permission_update for all users")

            db.session.commit()
            current_app.logger.info("Permissions and roles setup completed.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error setting up permissions and roles: {str(e)}")

if __name__ == '__main__':
    setup_permissions_and_roles()