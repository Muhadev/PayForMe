import React from 'react';
import HeroSection from '../components/layout/HeroSection';
import DiscoverySection from '../components/layout/DiscoverySection';
import LatestNewsSection from '../components/layout/LatestNewsSection';
import AboutPayForMeSection from '../components/layout/AboutPayForMeSection';
import VideoSection from '../components/layout/VideoSection';
import PayForMeSection from '../components/layout/PayForMeSection'; // Import the PayForMeSection
import Footer from '../components/layout/Footer';

function HomePage() {
  return (
    <>
      <HeroSection />
      <DiscoverySection />
      <LatestNewsSection />
      <AboutPayForMeSection />
      <VideoSection/>
      <PayForMeSection /> {/* Include the new section */}
      <Footer/>
    </>
  );
}

export default HomePage;
