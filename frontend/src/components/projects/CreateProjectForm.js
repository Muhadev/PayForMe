// components/projects/CreateProjectForm.js
import React, { useState } from 'react';
import { Form, Button, Row, Col, Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { toast } from 'react-toastify';
import 'react-quill/dist/quill.snow.css';
import './CreateProjectForm.css';
import { createFormData } from '../../utils/formUtils';
import * as projectService from '../../services/projectService';
import { useProjectForm } from '../../hooks/useProjectForm';
import MediaPreview from './MediaPreview';

function CreateProjectForm({ projectId, isDraftEdit, isEdit, initialData }) {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    // control,
    categories,
    isSubmitting,
    imagePreview,
    setImagePreview,
    videoPreview,
    setVideoPreview,
    handleFormSubmit,
    handleImageChange,
    handleVideoChange,
    handleImageUrlChange,
    handleVideoUrlChange,
    imageFile,  // Add this line
    videoFile,  // Add this line
  } = useProjectForm(projectId, isDraftEdit, isEdit, initialData);

  // Add handlers for removing media
  const handleRemoveImage = () => {
    setImagePreview(null);
    setValue('imageUrl', '');
    setValue('imageType', null);
  };

  const handleRemoveVideo = () => {
    setVideoPreview(null);
    setValue('videoUrl', '');
    setValue('videoType', null);
  };


  const handleSaveDraft = async (data) => {
    const success = await handleFormSubmit(data, true);
    if (success) {
      navigate('/my-projects?tab=drafts');
    }
  };

  const handleCreateProject = async (data) => {
    try {
        const success = await handleFormSubmit(data, false);
        if (success) {
            navigate('/my-projects');
        }
    } catch (error) {
        toast.error(`Failed to create project: ${error.message}`);
        console.error('Project creation failed:', error);
    }
  };

  const handleUpdateProject = async (data) => {
    try {
        // Use the projectService.updateProject function directly
        const success = await projectService.updateProject(projectId, createFormData(data, false));
        if (success) {
            toast.success('Project updated successfully');
            navigate(`/projects/${projectId}`);
        }
    } catch (error) {
        toast.error(`Failed to update project: ${error.message}`);
        console.error('Project update failed:', error);
    }
  };


  // Preview Modal Content Component
  const ProjectPreview = () => {
    const formData = watch();
    const selectedCategory = categories.find(c => c.id === parseInt(formData.category_id));

    return (
      <div className="project-preview">
        <h2 className="mb-4">{formData.title || 'Untitled Project'}</h2>
        
        <div className="mb-4">
          <h4>Category</h4>
          <p>{selectedCategory?.name || 'Not specified'}</p>
        </div>
        
        <div className="mb-4">
          <h4>Goal Amount</h4>
          <p>${formData.goal_amount || '0.00'}</p>
        </div>
        
        <div className="mb-4">
          <h4>Project Duration</h4>
          <p>From: {formData.start_date || 'Not specified'}</p>
          <p>To: {formData.end_date || 'Not specified'}</p>
        </div>
        
        <div className="mb-4">
          <h4>Project Description</h4>
          <div dangerouslySetInnerHTML={{ __html: formData.description || 'No description provided' }} />
        </div>
        
        <div className="mb-4">
          <h4>Risks and Challenges</h4>
          <div dangerouslySetInnerHTML={{ __html: formData.risk_and_challenges || 'No risks and challenges specified' }} />
        </div>
        
        <div className="mb-4">
          <h4>Project Media</h4>
          {imagePreview && (
            <MediaPreview 
              type="image" 
              preview={imagePreview}
            />
          )}

          {videoPreview && (
            <MediaPreview 
              type="video" 
              preview={videoPreview}
            />
          )}
        </div>
      </div>
    );
  };

  // Guidelines Modal Content Component
  const ProjectGuidelines = () => (
    <div className="project-guidelines">
      <h3>Tips for a Successful Project</h3>
      <ul>
        <li>Choose a clear, attention-grabbing title</li>
        <li>Set a realistic funding goal</li>
        <li>Provide a detailed description of your project</li>
        <li>Add high-quality images or videos</li>
        <li>Be transparent about potential risks and challenges</li>
        <li>Create a realistic project timeline</li>
        <li>Consider your target audience</li>
        <li>Plan your marketing strategy</li>
      </ul>
    </div>
  );

  return (
    <>
      <Button 
        variant="info" 
        className="mb-3" 
        onClick={() => setShowGuidelines(true)}
      >
        View Project Guidelines
      </Button>

      <Form onSubmit={handleSubmit(handleCreateProject)}>
        {/* Title Field */}
        <Form.Group className="mb-3">
          <Form.Label>Project Title *</Form.Label>
          <Form.Control
            type="text"
            {...register("title", { required: "Title is required" })}
          />
          {errors.title && (
            <Form.Text className="text-danger">
              {errors.title.message}
            </Form.Text>
          )}
        </Form.Group>

        {/* Category Field */}
        <Form.Group className="mb-3">
          <Form.Label>Category {!isDraftEdit && '*'}</Form.Label>
          <Form.Control
            as="select"
            {...register("category_id", { required: !isDraftEdit })}
            value={watch("category_id")}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id.toString()}>
                {category.name}
              </option>
            ))}
          </Form.Control>
          {errors.category_id && (
            <Form.Text className="text-danger">
              {errors.category_id.message}
            </Form.Text>
          )}
        </Form.Group>

        {/* Goal Amount Field */}
        <Form.Group className="mb-3">
          <Form.Label>Funding Goal ($) {!isDraftEdit && '*'}</Form.Label>
          <Form.Control
            type="number"
            {...register("goal_amount", { required: !isDraftEdit })}
          />
          {errors.goal_amount && (
            <Form.Text className="text-danger">
              {errors.goal_amount.message}
            </Form.Text>
          )}
        </Form.Group>

        {/* Project Dates */}
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Start Date {!isDraftEdit && '*'}</Form.Label>
              <Form.Control
                type="date"
                {...register("start_date", { required: !isDraftEdit })}
              />
              {errors.start_date && (
                <Form.Text className="text-danger">
                  {errors.start_date.message}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>End Date {!isDraftEdit && '*'}</Form.Label>
              <Form.Control
                type="date"
                {...register("end_date", { required: !isDraftEdit })}
              />
              {errors.end_date && (
                <Form.Text className="text-danger">
                  {errors.end_date.message}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
        </Row>

        {/* Description Field */}
        <Form.Group className="mb-3">
          <Form.Label>Project Description {!isDraftEdit && '*'}</Form.Label>
          <ReactQuill
            value={watch('description') || ''}
            onChange={(content) => setValue('description', content)}
          />
          {errors.description && (
            <Form.Text className="text-danger">
              {errors.description.message}
            </Form.Text>
          )}
        </Form.Group>

        {/* Risks and Challenges Field */}
        <Form.Group className="mb-3">
          <Form.Label>Risks and Challenges {!isDraftEdit && '*'}</Form.Label>
          <ReactQuill
            value={watch('risk_and_challenges') || ''}
            onChange={(content) => setValue('risk_and_challenges', content)}
          />
          {errors.risk_and_challenges && (
            <Form.Text className="text-danger">
              {errors.risk_and_challenges.message}
            </Form.Text>
          )}
        </Form.Group>

        {/* Updated Image Field */}
        <Form.Group className="mb-3">
          <Form.Label>Project Image</Form.Label>
          <div className="mb-2">
            <Form.Check
              type="radio"
              label="Upload Image"
              name="imageType"
              value="file"
              checked={watch('imageType') === 'file'}
              onChange={(e) => setValue('imageType', 'file')}
            />
            <Form.Check
              type="radio"
              label="Image URL"
              name="imageType"
              value="url"
              checked={watch('imageType') === 'url'}
              onChange={(e) => setValue('imageType', 'url')}
            />
          </div>

          {watch('imageType') === 'file' ? (
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          ) : (
            <Form.Control
              type="text"
              placeholder="Enter image URL"
              {...register("imageUrl")}
              onChange={(e) => handleImageUrlChange(e.target.value)}
            />
          )}

          {imagePreview && (
            <MediaPreview 
              type="image" 
              preview={imagePreview}
              file={imageFile} // Pass the actual file
              onRemove={handleRemoveImage}
            />
          )}
        </Form.Group>

        {/* Updated Video Field */}
        <Form.Group className="mb-3">
          <Form.Label>Project Video</Form.Label>
          <div className="mb-2">
            <Form.Check
              type="radio"
              label="Upload Video"
              name="videoType"
              value="file"
              checked={watch('videoType') === 'file'}
              onChange={(e) => setValue('videoType', 'file')}
            />
            <Form.Check
              type="radio"
              label="Video URL"
              name="videoType"
              value="url"
              checked={watch('videoType') === 'url'}
              onChange={(e) => setValue('videoType', 'url')}
            />
          </div>

          {watch('videoType') === 'file' ? (
            <Form.Control
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
            />
          ) : (
            <Form.Control
              type="text"
              placeholder="Enter video URL"
              {...register("videoUrl")}
              onChange={(e) => handleVideoUrlChange(e.target.value)}
            />
          )}

          {videoPreview && (
            <MediaPreview 
              type="video" 
              preview={videoPreview}
              file={videoFile} // Pass the actual file
              onRemove={handleRemoveVideo}
            />
          )}
        </Form.Group>

        {/* Featured Checkbox */}
        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            label="Feature this project (admin will review)"
            {...register("featured")}
          />
        </Form.Group>

        {/* Updated buttons section */}
      <div className="d-flex gap-2 mt-4">
        {isEdit ? (
          <>
            <Button
              variant="info"
              onClick={() => setShowPreview(true)}
              disabled={isSubmitting}
            >
              Preview Changes
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(handleUpdateProject)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="me-2" animation="border" />
                  Updating Project...
                </>
              ) : (
                'Update Project'
              )}
            </Button>
          </>
        ) : isDraftEdit ? (
          <>
            <Button
              variant="secondary"
              onClick={handleSubmit(handleSaveDraft)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="me-2" animation="border" />
                  Updating Draft...
                </>
              ) : (
                'Update Draft'
              )}
            </Button>
            <Button
              variant="info"
              onClick={() => setShowPreview(true)}
              disabled={isSubmitting}
            >
              Preview
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="me-2" animation="border" />
                  Creating Project...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={handleSubmit(handleSaveDraft)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="me-2" animation="border" />
                  Saving Draft...
                </>
              ) : (
                'Save as Draft'
              )}
            </Button>
            <Button
              variant="info"
              onClick={() => setShowPreview(true)}
              disabled={isSubmitting}
            >
              Preview
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="me-2" animation="border" />
                  Creating Project...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </>
        )}
      </div>
      </Form>

      {/* Preview Modal */}
      <Modal 
        show={showPreview} 
        onHide={() => setShowPreview(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Project Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProjectPreview />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Guidelines Modal */}
      <Modal 
        show={showGuidelines} 
        onHide={() => setShowGuidelines(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Project Guidelines</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProjectGuidelines />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGuidelines(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default CreateProjectForm;