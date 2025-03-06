// Footer.js
import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>About</h3>
          <ul>
            <li><a href="#how-it-works">How PayForMe Works</a></li>
            <li><a href="#guarantee">PayForMe Giving Guarantee</a></li>
            <li><a href="#supported-countries">Supported Countries</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#help-center">Help Center</a></li>
            <li><a href="#about-us">About PayForMe</a></li>
            <li><a href="#newsroom">Newsroom</a></li>
            <li><a href="#careers">Careers</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Donate</h3>
          <ul>
            <li><a href="#crisis-relief">Crisis Relief</a></li>
            <li><a href="#social-impact">Social Impact Funds</a></li>
            <li><a href="#supporter-space">Supporter Space</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Fundraise</h3>
          <ul>
            <li><a href="#how-to-start">How to Start a PayForMe</a></li>
            <li><a href="#fundraising-categories">Fundraising Categories</a></li>
            <li><a href="#team-fundraising">Team Fundraising</a></li>
            <li><a href="#fundraising-blog">Fundraising Blog</a></li>
            <li><a href="#charity-fundraising">Charity Fundraising</a></li>
            <li><a href="#sign-up">Sign Up as a Charity</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>More Resources</h3>
          <ul>
            <li><a href="#terms">Terms</a></li>
            <li><a href="#privacy-notice">Privacy Notice</a></li>
            <li><a href="#legal">Legal</a></li>
            <li><a href="#accessibility">Accessibility Statement</a></li>
            <li><a href="#cookie-policy">Cookie Policy</a></li>
            <li><a href="#privacy-choices">Your Privacy Choices</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 PayForMe. All rights reserved.</p>
        <p>Coming Soon on <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer">Google Play</a> | Available on <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">the App Store</a></p>
      </div>
    </footer>
  );
}

export default Footer;
