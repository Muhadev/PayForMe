// AboutPayForMeSection.js
import React from 'react';
import './AboutPayForMeSection.css';

function AboutPayForMeSection() {
  return (
    <section className="about-payforme-section">
      <div className="container">
        <h2>Fundraising on PayForMe is easy, powerful, and trusted.</h2>
        <p>
          Get what you need to help your fundraiser succeed on PayForMe, whether you’re raising money for yourself,
          friends, family, or charity. With no fee to start, PayForMe is the world’s leading crowdfunding platform—from 
          memorial tributes and funerals to medical emergencies and nonprofits. Whenever you need help, you can ask here.
        </p>
        <a href="/how-it-works" className="learn-more-link">Still have questions? Learn more about how PayForMe works.</a>
      </div>
    </section>
  );
}

export default AboutPayForMeSection;
