import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import FAQsPage from './pages/FAQsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';  // Added for project details page
import CreateProjectPage from './pages/CreateProjectPage';  // Added for create project page
import UserDashboardPage from './pages/UserDashboardPage';  // Added for user dashboard page
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm';
import 'react-toastify/dist/ReactToastify.css';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import PasswordResetSuccess from './components/auth/PasswordResetSuccess';
import PasswordResetFailed from './components/auth/PasswordResetFailed';
import ResetPassword from './components/auth/ResetPassword';
import { ToastContainer } from 'react-toastify';
import CategoryManagement from './pages/CategoryManagement';
import MyProjectsPage from './pages/MyProjectsPage';
import BackedProjectsPage from './pages/BackedProjectsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AuthCallback from './components/auth/AuthCallback';
// import CreateProjectForm from './components/projects/CreateProjectForm';

// import CreateProjectPage from './pages/CreateProjectPage';
// Other imports...

// console.log('MyProjects:', MyProjects);
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastContainer
        position="bottom-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="faqs" element={<FAQsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailsPage />} /> {/* Dynamic route for project details */}
          <Route path="projects/create" element={<CreateProjectPage />} />
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="signin" element={<SignInPage />} />
          <Route path="register" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/password-reset-success" element={<PasswordResetSuccess />} />
          <Route path="/password-reset-failed" element={<PasswordResetFailed />} />
          <Route path="categories" element={<CategoryManagement/>} />
          <Route path="/verify-email" element={<VerifyEmailPage/>} />
          <Route path="my-projects" element={<MyProjectsPage />} />
          <Route path="backed-projects" element={<BackedProjectsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="/password-reset/:token" element={<ResetPassword />} />
          <Route path="projects/drafts/edit/:id" element={<CreateProjectPage />} />
          {/* <Route path="projects/drafts/:id" element={<ProjectDetailsPage />} /> */}
          {/* <Route path="/projects/:id" element={<ProjectDetailsPage />} /> */}
          <Route path="/projects/drafts/:id" element={<ProjectDetailsPage isDraft={true} />} />
          {/* <Route path="/projects/drafts/edit/:id" element={<CreateProjectPage />} /> */}
          <Route path="/projects/edit/:id" element={<CreateProjectPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* <Route path="projects/:id" element={<ProjectDetailPage />} /> */}
          {/* Add more routes as needed */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
