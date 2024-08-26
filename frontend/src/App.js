import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';  // Added for project details page
import CreateProjectPage from './pages/CreateProjectPage';  // Added for create project page
import UserDashboardPage from './pages/UserDashboardPage';  // Added for user dashboard page
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
// import CreateProjectPage from './pages/CreateProjectPage';
// Other imports...

function App() {
  return (
    <Router>
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
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="project/:id" element={<ProjectDetailPage />} /> {/* Dynamic route for project details */}
          <Route path="create-project" element={<CreateProjectPage />} />
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="signin" element={<SignInPage />} />
          <Route path="register" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordForm />} />
          {/* Add more routes as needed */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
