// VideoSection.js
import React from 'react';
import './VideoSection.css';

function VideoSection() {
  return (
    <section className="video-section">
      <div className="container">
        <h2>Learn More About PayForMe</h2>
        <p>
          Watch this short video to understand how PayForMe works and how it can help you raise funds effectively. Whether you're fundraising for personal needs, a charity, or a community project, PayForMe is here to support you every step of the way.
        </p>
        <div className="video-wrapper">
          <iframe
            src="https://www.youtube.com/watch?v=EWdcOID8zxU"
            title="PayForMe Explainer Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  );
}

export default VideoSection;
