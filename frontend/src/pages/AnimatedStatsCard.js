import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';

const AnimatedStatsCard = ({ icon, title, value, color, prefix = '', suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef(null);
  const countStarted = useRef(false);
  
  // Function to format numbers with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Setup intersection observer to trigger animation when card is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When card enters viewport and animation hasn't started yet
        if (entry.isIntersecting && !countStarted.current) {
          setIsInView(true);
          countStarted.current = true;
        }
      },
      { threshold: 0.1 } // Trigger when at least 10% of the element is visible
    );
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);
  
  // Animation effect to count up to the value
  useEffect(() => {
    if (!isInView) return;
    
    let startValue = 0;
    const endValue = value;
    const totalFrames = 60; // 60fps animation
    const timePerFrame = duration / totalFrames;
    const increment = endValue / totalFrames;
    let currentCount = startValue;
    
    const counter = setInterval(() => {
      currentCount += increment;
      
      if (currentCount > endValue) {
        currentCount = endValue;
        clearInterval(counter);
      }
      
      setCount(Math.floor(currentCount));
    }, timePerFrame);
    
    return () => clearInterval(counter);
  }, [isInView, value, duration]);
  
  return (
    <Card className="text-center h-100 shadow-sm" ref={cardRef}>
      <Card.Body>
        <FontAwesomeIcon icon={icon} size="2x" className={`mb-2 text-${color}`} />
        <h5>{title}</h5>
        <h3 className="mt-2">
          {prefix}{formatNumber(count)}{suffix}
        </h3>
      </Card.Body>
    </Card>
  );
};

AnimatedStatsCard.propTypes = {
  icon: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  color: PropTypes.string,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
  duration: PropTypes.number
};

export default AnimatedStatsCard;