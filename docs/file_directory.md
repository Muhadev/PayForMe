frontend/
└── src/
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.js
    │   │   ├── Footer.js
    │   │   └── Layout.js
    │   ├── auth/
    │   │   ├── SignInPage.js
    │   │   ├── SignUpPage.js
    │   │   └── ForgotPasswordForm.js
    │   ├── projects/
    │   │   ├── ProjectCard.js
    │   │   ├── ProjectList.js
    │   │   ├── ProjectDetails.js
    │   │   └── CreateProjectForm.js
    │   ├── donations/
    │   │   ├── DonationForm.js
    │   │   └── DonationList.js
    │   └── common/
    │       ├── Button.js
    │       ├── Input.js
    │       └── Modal.js
    ├── pages/
    │   ├── HomePage.js
    │   ├── LoginPage.js
    │   ├── RegisterPage.js
    │   ├── ProjectsPage.js
    │   ├── ProjectDetailPage.js
    │   ├── CreateProjectPage.js
    │   ├── UserDashboardPage.js
    │   └── AboutPage.js
    ├── App.js
    └── index.js


├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   └── donation.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   └── donations.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── user_service.py
│   │   │   ├── project_service.py
│   │   │   └── donation_service.py
│   │   └── utils/
│   │   |     ├── __init__.py
│   │   |     └── validator.py
|   |   |__ scripts/
│   ├── config.py
│   ├── requirements.txt
│   └── run.py


{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTcyNDMxMDk1OSwianRpIjoiMzFhNGFjMDgtNTFjMC00M2M1LWEzOWYtMDViMWE2OWYxNGJjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6MTIsIm5iZiI6MTcyNDMxMDk1OSwiY3NyZiI6ImU2MmY0YTc4LTM5MDMtNDdiMC1iMjQ5LWQ1YWQ3NjUxYzM1ZCIsImV4cCI6MTcyNDMxMTg1OX0.vZ3_0UVzaSQNAosNnF_SHP3P64aYe8DWFy-hTJxssHQ",
    "msg": "Login successful",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTcyNDMxMDk1OSwianRpIjoiMjhhNzQwMWMtNGUxNC00NzQyLThkOTctZmQ1Zjk2NzE1ZmRjIiwidHlwZSI6InJlZnJlc2giLCJzdWIiOjEyLCJuYmYiOjE3MjQzMTA5NTksImNzcmYiOiI2MjhjODUwNS01OTMxLTRiNTYtYWJmYi1jNjU3OTdlOWY0NDgiLCJleHAiOjE3MjY5MDI5NTl9.Tbs15SG85U9K_Et3-RqVNaYJOu15cHyhxoZVoidMdkM"
}