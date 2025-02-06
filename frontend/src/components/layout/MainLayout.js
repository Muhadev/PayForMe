import React from 'react';
import { Outlet } from 'react-router-dom';
import AppNavbar from './Navbar';
// import Footer from './Footer';

function MainLayout() {
  return (
    <div>
      <AppNavbar />
      <main style={{ marginTop: '70px' }}> {/* Space for the navbar */}
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
}

export default MainLayout;
