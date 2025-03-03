// PayForMeSection.js
import React from 'react';
import { Container } from 'react-bootstrap';
import './PayForMeSection.css';
import trustImage from '../../assets/subs.jpg'; // Add your trust-related image here

function PayForMeSection() {
  return (
    <section className="payforme-section">
      <Container>
        <div className="payforme-container">
          <div className="payforme-content">
            <h2>We've Got You Covered</h2>
            <p>
              PayForMe is a trusted leader in online fundraising. With simple pricing and a team of Trust & Safety experts in your corner, you can raise money or make a donation with peace of mind.
            </p>
          </div>
          <div className="payforme-image-container">
            <img src={trustImage} alt="Trust & Safety" className="payforme-image" />
          </div>
        </div>
      </Container>
    </section>
  );
}

export default PayForMeSection;