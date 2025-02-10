// StatsSection.js
import React, { useEffect, useRef } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import './StatsSection.css';

const StatsIcon = () => {
  const stats = [
    { number: "500K+", label: "Backers", icon: "bi-people", color: "#4285f4" },
    { number: "$50M+", label: "Funds Raised", icon: "bi-graph-up", color: "#34a853" },
    { number: "15K+", label: "Projects Funded", icon: "bi-trophy", color: "#fbbc05" },
    { number: "98%", label: "Success Rate", icon: "bi-shield-check", color: "#ea4335" },
    { number: "180+", label: "Countries", icon: "bi-globe", color: "#4285f4" },
    { number: "25K+", label: "Active Campaigns", icon: "bi-rocket", color: "#34a853" },
    { number: "1M+", label: "Community Members", icon: "bi-heart", color: "#fbbc05" },
    { number: "4.9/5", label: "User Rating", icon: "bi-star", color: "#ea4335" }
  ];

  const scrollRef = useRef(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    let scrollPosition = 0;
    let animationFrameId;

    const scroll = () => {
      scrollPosition += 1;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="stats-icon">
      <Container fluid>
        <Row>
          <Col className="p-0">
            <div className="stats-scroll-container" ref={scrollRef}>
              <div className="stats-inner-container">
                {[...stats, ...stats].map((stat, index) => (
                  <div key={index} className="stat-item">
                    <div className="stat-content">
                      <i className={`bi ${stat.icon} stat-icon`} style={{ color: stat.color }}></i>
                      <h2 className="stat-number" style={{ color: stat.color }}>{stat.number}</h2>
                      <p className="stat-label">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default StatsIcon;