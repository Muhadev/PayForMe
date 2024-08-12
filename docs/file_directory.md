frontend/
└── src/
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.js
    │   │   ├── Footer.js
    │   │   └── Layout.js
    │   ├── auth/
    │   │   ├── LoginForm.js
    │   │   ├── RegisterForm.js
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
│   │       ├── __init__.py
│   │       └── validator.py
│   ├── config.py
│   ├── requirements.txt
│   └── run.py