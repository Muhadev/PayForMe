# seed_rewards.py
from app import create_app, db # Assuming this imports your app and sets up the db session
from app.models.project import Project
from app.models.reward import Reward
from datetime import datetime

def seed_rewards():
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

if __name__ == '__main__':
    seed_rewards()
