import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Image, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useForm, Controller } from 'react-hook-form';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function CreateProjectForm() {
  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues, control } = useForm({
    defaultValues: {
      title: "",
      category_id: "",
      goal_amount: "",
      start_date: "",
      end_date: "",
      description: "",
      risk_and_challenges: "",
      image: null,
      imageUrl: "",
      imageType: "file",
      video: null,
      videoUrl: "",
      videoType: "file",
      featured: false // Default value for the featured field
    },
    mode: 'onBlur'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const navigate = useNavigate();

  const watchImageType = watch('imageType', 'file');
  const watchVideoType = watch('videoType');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/categories`, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    }
  };

  const onSubmit = async (data, isDraft = false) => {
    setIsLoading(true);
    const formData = new FormData();
    // Always append title for both draft and non-draft
    formData.append("title", data.title);

    // Append status (either draft or pending)
    formData.append('status', isDraft ? 'draft' : 'pending');

    // Append the featured field
    formData.append("featured", data.featured);

    // Only append other fields if it's not a draft
    if (!isDraft) {
      formData.append("description", data.description);
      formData.append("goal_amount", data.goal_amount);
      formData.append("start_date", data.start_date);
      formData.append("end_date", data.end_date);
      formData.append("category_id", data.category_id);
      formData.append("risk_and_challenges", data.risk_and_challenges);

      // Handle image
      if (data.imageType === 'file' && data.image[0]) {
        formData.append('image', data.image[0]);
      } else if (data.imageType === 'url') {
        formData.append('imageUrl', data.imageUrl);
      }

      // Handle video
      if (data.videoType === 'file' && data.video[0]) {
        formData.append('video', data.video[0]);
      } else if (data.videoType === 'url') {
        formData.append('videoUrl', data.videoUrl);
      }
    }

    try {
      const endpoint = isDraft ? '/api/v1/projects/drafts' : 'projects';
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/${endpoint}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success(isDraft ? 'Project saved as draft' : 'Project submitted successfully!');
      navigate(isDraft ? `/api/v1/projects/drafts/${response.data.project.id}` : `/api/v1/projects/${response.data.project.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'An error occurred while processing the project');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image file input safely
  const handleImageChange = (e) => {
    const file = e.target.files[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setValue('image', [file]);
    } else {
      setValue('image', null);
    }
  };

  // Handle video file input safely
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result);
      reader.readAsDataURL(file);
      setValue('video', [file]);
    }
  };

  const ProjectPreview = () => (
    <div className="project-preview">
      <h2>{getValues('title')}</h2>
      <p>Category: {categories.find(c => c.id === parseInt(getValues('category_id')))?.name}</p>
      <p>Goal: ${getValues('goal_amount')}</p>
      <p>Duration: {getValues('start_date')} to {getValues('end_date')}</p>
      {watchImageType === 'file' && imagePreview && (
        <Image src={imagePreview} alt="Project preview" fluid />
      )}
      {watchImageType === 'url' && getValues('imageUrl') && (
        <Image src={getValues('imageUrl')} alt="Project preview" fluid />
      )}
      <div dangerouslySetInnerHTML={{ __html: getValues('description') }} />
      <h4>Risks and Challenges</h4>
      <p>{getValues('risk_and_challenges')}</p>
      {watchVideoType === 'file' && videoPreview && (
        <video src={videoPreview} controls width="100%" />
      )}
      {watchVideoType === 'url' && getValues('videoUrl') && (
        <p>Video URL: {getValues('videoUrl')}</p>
      )}
    </div>
  );

  const ProjectGuidelines = () => (
    <div className="project-guidelines">
      <h3>Tips for a Successful Project</h3>
      <ul>
        <li>Choose a clear, attention-grabbing title</li>
        <li>Set a realistic funding goal</li>
        <li>Provide a detailed description of your project</li>
        <li>Add high-quality images or videos</li>
        <li>Clearly explain how the funds will be used</li>
        <li>Offer compelling rewards to backers</li>
        <li>Create a project timeline</li>
        <li>Be transparent about potential risks and challenges</li>
      </ul>
    </div>
  );

  return (
    <>
      <Button variant="info" className="mb-3" onClick={() => setShowGuidelines(true)}>
        View Project Guidelines
      </Button>
      <Form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
        <Form.Group className="mb-3">
          <Form.Label>Project Title</Form.Label>
          <Form.Control 
            type="text"
            {...register("title", { 
              required: "Title is required",
              maxLength: { value: 100, message: "Title must be 100 characters or less" }
            })}
          />
          {errors.title && <span className="text-danger">{errors.title.message}</span>}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Control 
            as="select"
            {...register("category_id", { required: !isDraft ? "Category is required" : false })}
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Form.Control>
          {errors.category_id && <span className="text-danger">{errors.category_id.message}</span>}
        </Form.Group>

        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Funding Goal ($)</Form.Label>
              <Form.Control 
                type="number"
                {...register("goal_amount", { 
                  required: !isDraft ? "Funding goal is required" : false,
                  min: { value: 1, message: "Funding goal must be positive" }
                })}
              />
              {errors.goal_amount && <span className="text-danger">{errors.goal_amount.message}</span>}
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control 
                type="date"
                {...register("start_date", { required: !isDraft ? "Start date is required" : false })}
              />
              {errors.start_date && <span className="text-danger">{errors.start_date.message}</span>}
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control 
                type="date"
                {...register("end_date", { required: !isDraft ? "End date is required" : false })}
              />
              {errors.end_date && <span className="text-danger">{errors.end_date.message}</span>}
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Project Description</Form.Label>
          <Controller
            name="description"
            control={control}
            rules={{ required: !isDraft ? "Description is required" : false }}
            render={({ field }) => <ReactQuill {...field} />}
          />
          {errors.description && <span className="text-danger">{errors.description.message}</span>}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Risks and Challenges</Form.Label>
          <Form.Control 
            as="textarea" 
            rows={3}
            {...register("risk_and_challenges", { 
              required: !isDraft ? "Risks and challenges are required" : false, 
              maxLength: { value: 1000, message: "Risks and challenges must be 1000 characters or less" }
            })}
          />
          {errors.risk_and_challenges && <span className="text-danger">{errors.risk_and_challenges.message}</span>}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Project Image</Form.Label>
          <Form.Check
            type="radio"
            label="Upload Image"
            name="imageType"
            value="file"
            {...register("imageType")}
            defaultChecked
          />
          <Form.Check
            type="radio"
            label="Image URL"
            name="imageType"
            value="url"
            {...register("imageType")}
          />
          
          {/* Conditionally Render File Input or URL Input */}
          {watchImageType === 'file' && (
            <Form.Group>
              <Form.Label>Upload Image</Form.Label>
              <Controller
                name="image"
                control={control}
                rules={{ required: !isDraft && watchImageType === 'file' ? "Project image is required" : false }}
                render={({ field }) => (
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleImageChange(e);
                      field.onChange(e.target.files);
                    }}
                  />
                )}
              />
              {errors.image && <span className="text-danger">{errors.image.message}</span>}
            </Form.Group>
          )}

          {watchImageType === 'url' && (
            <Form.Group>
              <Form.Label>Image URL</Form.Label>
              <Form.Control
                type="text"
                {...register("imageUrl", { required: !isDraft && watchImageType === 'url' ? "Image URL is required" : false })}
              />
              {errors.imageUrl && <span className="text-danger">{errors.imageUrl.message}</span>}
            </Form.Group>
          )}
          
          {imagePreview && watchImageType === 'file' && (
            <Image src={imagePreview} alt="Project preview" thumbnail className="mt-2" style={{ maxWidth: '200px' }} />
          )}
        </Form.Group>


        <Form.Group className="mb-3">
          <Form.Label>Project Video</Form.Label>
          <Form.Check
            type="radio"
            label="Upload Video"
            name="videoType"
            value="file"
            {...register("videoType")}
            defaultChecked
          />
          <Form.Check
            type="radio"
            label="Video URL"
            name="videoType"
            value="url"
            {...register("videoType")}
          />
          {watchVideoType === 'file' && (
            <Form.Control 
              type="file" 
              accept="video/*"
              {...register("video", { 
                required: !isDraft && watchVideoType === 'file' ? "Project video is required" : false 
              })}
              onChange={handleVideoChange}
            />
          )}
          {watchVideoType === 'url' && (
            <Form.Control 
              type="url" 
              placeholder="Enter video URL (YouTube, Vimeo, etc.)"
              {...register("videoUrl", { 
                required: !isDraft && watchVideoType === 'url' ? "Video URL is required" : false 
              })}
            />
          )}
          {videoPreview && watchVideoType === 'file' && (
            <video src={videoPreview} controls width="200" className="mt-2" />
          )}

          {errors.video && <span className="text-danger">{errors.video.message}</span>}
          {errors.videoUrl && <span className="text-danger">{errors.videoUrl.message}</span>}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Check 
            type="checkbox"
            label="Feature this project (admin will review)"
            {...register("featured")}
          />
          <Form.Text className="text-muted">
            If selected, this project will be highlighted for users. 
          </Form.Text>
        </Form.Group>

        <Button variant="secondary" className="me-2" onClick={() => {
          setIsDraft(true);
          handleSubmit((data) => onSubmit(data, true))();
        }}>
          Save as Draft
        </Button>
        <Button variant="primary" onClick={() => setShowPreview(true)}>
          Preview
        </Button>

        <Button variant="success" type="submit" className="ms-2" disabled={isLoading} onClick={() => {
          setIsDraft(false);
          handleSubmit((data) => onSubmit(data, false))();
        }}>
          {isLoading ? 'Submitting...' : 'Submit Project'}
        </Button>
      </Form>

      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
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
          <Button variant="primary" onClick={handleSubmit((data) => {
            setShowPreview(false);
            onSubmit(data, false);
          })}>
            Submit Project
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showGuidelines} onHide={() => setShowGuidelines(false)}>
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