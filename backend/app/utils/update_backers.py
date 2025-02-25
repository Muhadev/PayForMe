from app import create_app, db
from app.models import Project

def update_backers_count():
    """Update the backers_count field for all projects based on their existing backers."""
    print("Starting to update backers_count for all projects...")
    
    projects = Project.query.all()
    updated_count = 0
    
    for project in projects:
        # Get the number of backers for this project
        backers_count = len(project.backers)
        
        # Update the backers_count field
        project.backers_count = backers_count
        
        # Print progress
        print(f"Project ID: {project.id}, Title: {project.title}, Backers: {backers_count}")
        updated_count += 1
    
    # Commit all changes at once
    db.session.commit()
    print(f"Successfully updated backers_count for {updated_count} projects.")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        update_backers_count()