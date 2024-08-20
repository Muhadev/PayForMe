import React from 'react';
import HeroSection from '../components/layout/HeroSection';
import DiscoverySection from '../components/layout/DiscoverySection';
import LatestNewsSection from '../components/layout/LatestNewsSection';
import AboutPayForMeSection from '../components/layout/AboutPayForMeSection';
import VideoSection from '../components/layout/VideoSection';

function HomePage() {
  return (
    <>
      <HeroSection />
      <DiscoverySection />
      <LatestNewsSection />
      <AboutPayForMeSection />
      <VideoSection/>
    </>
  );
}

export default HomePage;
