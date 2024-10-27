# db_seeder.py

from app import db, create_app
from app.models.payment import Payment, PaymentStatus, PaymentMethod, PaymentProvider

def seed_payment_enums():
    """
    Seed the database with enum values for PaymentStatus, PaymentMethod, and PaymentProvider.
    This ensures all possible enum values are present in their respective enum tables.
    """
    try:
        # Create tables if they don't exist
        db.create_all()
        
        # Seed PaymentStatus values
        print("Seeding PaymentStatus values...")
        for status in PaymentStatus:
            # Check if the enum value already exists in the database
            existing_status = db.session.execute(
                db.text(f"SELECT 1 FROM payment_status WHERE name = '{status.name}'")
            ).fetchone()
            
            if not existing_status:
                db.session.execute(
                    db.text(f"INSERT INTO payment_status (name) VALUES ('{status.name}')")
                )
        
        # Seed PaymentMethod values
        print("Seeding PaymentMethod values...")
        for method in PaymentMethod:
            existing_method = db.session.execute(
                db.text(f"SELECT 1 FROM payment_method WHERE name = '{method.name}'")
            ).fetchone()
            
            if not existing_method:
                db.session.execute(
                    db.text(f"INSERT INTO payment_method (name) VALUES ('{method.name}')")
                )
        
        # Seed PaymentProvider values
        print("Seeding PaymentProvider values...")
        for provider in PaymentProvider:
            existing_provider = db.session.execute(
                db.text(f"SELECT 1 FROM payment_provider WHERE name = '{provider.name}'")
            ).fetchone()
            
            if not existing_provider:
                db.session.execute(
                    db.text(f"INSERT INTO payment_provider (name) VALUES ('{provider.name}')")
                )
        
        # Commit all changes
        db.session.commit()
        print("Successfully seeded all payment enum values!")
        
    except Exception as e:
        db.session.rollback()
        print(f"Error seeding database: {str(e)}")
        raise
    finally:
        db.session.close()

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_payment_enums()