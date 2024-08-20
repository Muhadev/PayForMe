import React from 'react';
import { Outlet } from 'react-router-dom';
import AppNavbar from './Navbar';
import Footer from './Footer';

function MainLayout() {
  return (
    <div>
      <AppNavbar />
      <main>
        <>
        <Outlet />
        </>
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
