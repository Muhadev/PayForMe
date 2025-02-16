import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Twitter, Facebook, Linkedin, Link, Check } from 'lucide-react';

const ShareModal = ({ show, onHide, shareInfo }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareInfo?.url || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!shareInfo) return null;

  // Generate fallback social links if they don't exist
  const url = shareInfo.url || window.location.href;
  const encodedUrl = encodeURIComponent(url);
  
  const socialLinks = shareInfo.social_links || {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Share Project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <h6 className="mb-3">Share on Social Media</h6>
          <div className="d-flex gap-2">
            <Button 
              variant="outline-primary" 
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter size={18} className="me-2" />
              Twitter
            </Button>
            <Button 
              variant="outline-primary"
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook size={18} className="me-2" />
              Facebook
            </Button>
            <Button 
              variant="outline-primary"
              href={socialLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin size={18} className="me-2" />
              LinkedIn
            </Button>
          </div>
        </div>

        <div>
          <h6 className="mb-3">Copy Link</h6>
          <div className="d-flex gap-2">
            <input 
              type="text" 
              value={url} 
              className="form-control" 
              readOnly
            />
            <Button 
              variant="outline-secondary"
              onClick={handleCopyLink}
            >
              {copied ? <Check size={18} /> : <Link size={18} />}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ShareModal;