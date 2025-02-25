# In app/cli.py or similar file where you define Flask CLI commands
import click
from flask.cli import with_appcontext
from app import db
from app.models.project import Project

@click.command('update-backers-count')
@with_appcontext
def update_backers_count_command():
    """Update backers count for all projects."""
    projects = Project.query.all()
    for project in projects:
        project.backers_count = len(project.backers)
    db.session.commit()
    click.echo('Updated backers count for all projects.')

# Register the command
app.cli.add_command(update_backers_count_command)