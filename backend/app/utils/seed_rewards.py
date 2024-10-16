import os
import sys
from datetime import datetime

# Add the parent directory of 'app' to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app import create_app, db
from app.models import Project, Reward  # Make sure this import path is correct

def seed_rewards():
    # Create the Flask app instance
    app = create_app()

    # Push the application context to allow database access
    with app.app_context():
        project = Project.query.get(90)  # Ensure project ID 90 exists in your database

        if project is None:
            print("Project with ID 90 does not exist.")
            return

        rewards = [
            Reward(
                project_id=project.id,
                title="Bronze Supporter",
                description="A thank you note for your contribution.",
                minimum_amount=10.0,
                estimated_delivery=datetime(2024, 12, 31),
                quantity_available=100
            ),
            Reward(
                project_id=project.id,
                title="Silver Supporter",
                description="A custom t-shirt for your support.",
                minimum_amount=50.0,
                estimated_delivery=datetime(2024, 12, 31),
                quantity_available=50
            ),
            Reward(
                project_id=project.id,
                title="Gold Supporter",
                description="Exclusive invitation to project launch event.",
                minimum_amount=100.0,
                estimated_delivery=datetime(2024, 12, 31),
                quantity_available=20
            )
        ]

        # Add rewards to the database
        db.session.add_all(rewards)
        db.session.commit()
        print("Rewards added successfully!")

        # Query the rewards from the database and print their IDs
        added_rewards = Reward.query.filter_by(project_id=project.id).all()
        for reward in added_rewards:
            print(f"Reward '{reward.title}' added with ID: {reward.id}")

if __name__ == '__main__':
    seed_rewards()
