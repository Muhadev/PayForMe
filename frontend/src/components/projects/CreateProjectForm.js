import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Image, Modal, Spinner } from 'react-bootstrap';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
// import axiosInstance from '../../helper/axiosConfig'; 
import { refreshAccessToken } from '../../helper/authHelpers'; 
import { useForm, Controller } from 'react-hook-form';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CreateProjectForm.css';


// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  // withCredentials: true,
  headers: {
    'Accept': 'application/json',
    // 'Content-Type': 'application/json'
  }
});

// Add request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  console.log('Access Token:', localStorage.getItem('accessToken'));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Authorization header set:', config.headers.Authorization);
  } else {
    console.warn('Token is missing from local storage');
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add this after your request interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response Interceptor:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error Interceptor:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);
function CreateProjectForm() {
  const [isDraft, setIsDraft] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues, control, reset } = useForm({
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  // const [isDraft, setIsDraft] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const location = useLocation();
  const isDraftEdit = location.pathname.includes('/drafts/edit');

  const watchImageType = watch('imageType', 'file');
  const watchVideoType = watch('videoType');

  const fetchCategories = async () => {
    setIsLoading(true); // Show loading spinner
    try {
      const response = await api.get('/api/v1/categories/');
      console.log('Categories response:', response.data);
      if (response?.data?.data?.length) {
        setCategories(response.data.data);
      } else {
        toast.error('Invalid category data format received');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch categories';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false); // Hide loading spinner
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch draft data if in edit mode
  useEffect(() => {
    const fetchDraftData = async () => {
      if (id) {
        try {
          setIsLoading(true);
          const endpoint = isDraftEdit ? `/api/v1/projects/drafts/${id}` : `/api/v1/projects/${id}`;
          const token = localStorage.getItem('accessToken');
          
          const response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.data?.data) {
            const projectData = response.data.data;
            
            // Reset form with project data
            reset({
              title: projectData.title,
              category_id: projectData.category_id?.toString(),
              goal_amount: projectData.goal_amount,
              start_date: projectData.start_date,
              end_date: projectData.end_date,
              description: projectData.description,
              risk_and_challenges: projectData.risk_and_challenges,
              featured: projectData.featured,
              imageType: projectData.image_url ? 'url' : 'file',
              imageUrl: projectData.image_url || '',
              videoType: projectData.video_url ? 'url' : 'file',
              videoUrl: projectData.video_url || '',
            });

            // Set previews if available
            if (projectData.image_url) {
              setImagePreview(projectData.image_url);
            }
            if (projectData.video_url) {
              setVideoPreview(projectData.video_url);
            }
          }
        } catch (error) {
          console.error('Error fetching draft:', error);
          toast.error('Failed to fetch draft data: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchDraftData();
  }, [id, isDraftEdit, reset]);

  const handlePreview = () => {
    setShowPreview(true);
  };

  // Modified submit handler to properly handle draft saving
  const handleSaveAsDraft = async (data) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      
      // Only required fields for draft
      formData.append("title", data.title);
      formData.append("status", "draft");
      
      // Optional fields for draft
      if (data.description) formData.append("description", data.description);
      if (data.category_id) formData.append("category_id", data.category_id);
      if (data.goal_amount) formData.append("goal_amount", data.goal_amount);
      if (data.start_date) formData.append("start_date", data.start_date);
      if (data.end_date) formData.append("end_date", data.end_date);
      
      // Handle media files
      if (data.imageType === 'file' && data.image?.[0]) {
        formData.append('image', data.image[0]);
      } else if (data.imageType === 'url' && data.imageUrl) {
        formData.append('imageUrl', data.imageUrl);
      }

      if (data.videoType === 'file' && data.video?.[0]) {
        formData.append('video', data.video[0]);
      } else if (data.videoType === 'url' && data.videoUrl) {
        formData.append('videoUrl', data.videoUrl);
      }

      const response = await api.post('/api/v1/projects/drafts', formData);
      
      if (response.status === 201 || response.status === 200) {
        toast.success('Project saved as draft');
        navigate('/my-projects');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Updated form submission handler
  const onSubmit = async (data, isDraft = false) => {
    if (isDraft) {
      return handleSaveAsDraft(data);
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      // Required fields for full submission
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("goal_amount", data.goal_amount);
      formData.append("category_id", data.category_id);
      formData.append("start_date", data.start_date);
      formData.append("end_date", data.end_date);
      formData.append("status", "PENDING");
      
      // Optional fields
      if (data.risk_and_challenges) {
        formData.append("risk_and_challenges", data.risk_and_challenges);
      }
      
      // Handle media files
      if (data.imageType === 'file' && data.image?.[0]) {
        formData.append('image', data.image[0]);
      } else if (data.imageType === 'url' && data.imageUrl) {
        formData.append('imageUrl', data.imageUrl);
      }

      if (data.videoType === 'file' && data.video?.[0]) {
        formData.append('video', data.video[0]);
      } else if (data.videoType === 'url' && data.videoUrl) {
        formData.append('videoUrl', data.videoUrl);
      }

      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await api.post('/api/v1/projects', formData);
      
      if (response.status === 201 || response.status === 200) {
        toast.success('Project created successfully');
        navigate('/my-projects');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Detailed error:', error);
      if (error.response?.status === 401) {
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            return onSubmit(data, isDraft);
          }
        } catch (refreshError) {
          toast.error('Session expired. Please log in again.');
          return;
        }
      }
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to save project';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Updated getValidationRules function with all fields
const getValidationRules = (fieldName, isDraft) => {
  const baseRules = {
    title: { 
      required: "Title is required",
      maxLength: { value: 100, message: "Title must be 100 characters or less" }
    },
    description: { 
      required: !isDraft && "Description is required",
      maxLength: { value: 5000, message: "Description must be 5000 characters or less" }
    },
    goal_amount: { 
      required: !isDraft && "Goal amount is required",
      min: { value: 1, message: "Goal amount must be positive" },
      validate: value => !value || value > 0 || "Goal amount must be greater than 0"
    },
    category_id: { 
      required: !isDraft && "Category is required" 
    },
    start_date: { 
      required: !isDraft && "Start date is required",
      validate: {
        futureDate: date => !date || new Date(date) >= new Date().setHours(0, 0, 0, 0) || "Start date must be in the future"
      }
    },
    end_date: { 
      required: !isDraft && "End date is required",
      validate: {
        futureDate: date => !date || new Date(date) >= new Date().setHours(0, 0, 0, 0) || "End date must be in the future",
        afterStartDate: (date, formValues) => 
          !date || !formValues.start_date || new Date(date) > new Date(formValues.start_date) || 
          "End date must be after start date"
      }
    },
    risk_and_challenges: {
      required: !isDraft && "Risks and challenges are required",
      maxLength: { value: 1000, message: "Risks and challenges must be 1000 characters or less" }
    },
    image: {
      validate: {
        acceptedFormats: files => 
          !files?.[0] || ['image/jpeg', 'image/png', 'image/gif'].includes(files[0]?.type) || 
          "Only JPEG, PNG and GIF files are allowed"
      }
    },
    // Modified video validation to be optional
    video: {
      validate: {
        acceptedFormats: files =>
          !files?.[0] || ['video/mp4', 'video/quicktime'].includes(files[0]?.type) ||
          "Only MP4 and MOV files are allowed"
      }
    }
  };

  return baseRules[fieldName] || {};
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

  // Modified ProjectPreview component to avoid title duplication
  const ProjectPreview = () => {
    const formValues = getValues();
    const selectedCategory = categories.find(c => c.id === parseInt(formValues.category_id));

    return (
      <div className="project-preview">
        <h2 className="mb-4">{formValues.title || 'Untitled Project'}</h2>
        
        <div className="mb-4">
          <h4>Category</h4>
          <p>{selectedCategory?.name || 'Not specified'}</p>
        </div>
        
        <div className="mb-4">
          <h4>Goal Amount</h4>
          <p>${formValues.goal_amount || '0.00'}</p>
        </div>
        
        <div className="mb-4">
          <h4>Project Duration</h4>
          <p>From: {formValues.start_date || 'Not specified'}</p>
          <p>To: {formValues.end_date || 'Not specified'}</p>
        </div>
        
        <div className="mb-4">
          <h4>Project Description</h4>
          <div className="preview-content" dangerouslySetInnerHTML={{ __html: formValues.description || 'No description provided' }} />
        </div>
        
        <div className="mb-4">
          <h4>Risks and Challenges</h4>
          <div className="preview-content" dangerouslySetInnerHTML={{ __html: formValues.risk_and_challenges || 'No risks and challenges specified' }} />
        </div>
        
        <div className="mb-4">
          <h4>Project Media</h4>
          {watchImageType === 'file' && imagePreview && (
            <div className="mb-3">
              <p>Project Image:</p>
              <Image src={imagePreview} alt="Project preview" fluid className="preview-image" />
            </div>
          )}
          {watchImageType === 'url' && formValues.imageUrl && (
            <div className="mb-3">
              <p>Project Image URL:</p>
              <Image src={formValues.imageUrl} alt="Project preview" fluid className="preview-image" />
            </div>
          )}
          
          {watchVideoType === 'file' && videoPreview && (
            <div className="mb-3">
              <p>Project Video:</p>
              <video src={videoPreview} controls width="100%" className="preview-video" />
            </div>
          )}
          {watchVideoType === 'url' && formValues.videoUrl && (
            <div className="mb-3">
              <p>Project Video URL:</p>
              <p>{formValues.videoUrl}</p>
            </div>
          )}
        </div>
  
        {formValues.featured && (
          <div className="mb-4">
            <h4>Featured Status</h4>
            <p>This project is marked for featured consideration</p>
          </div>
        )}
      </div>
    );
  };
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
      <Form className="project-form"onSubmit={handleSubmit((data) => onSubmit(data, false))}>
        <Form.Group className="mb-3">
          <Form.Label>Project Title</Form.Label>
          <Form.Control 
            type="text"
            {...register("title", getValidationRules("title", false), { 
              maxLength: { value: 100, message: "Title must be 100 characters or less" }
            })}
          />
          {errors.title && <span className="text-danger">{errors.title.message}</span>}
        </Form.Group>

        <Form.Group controlId="category_id" className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Control 
            as="select"
            {...register("category_id", getValidationRules("category_id", false))}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
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
                {...register("goal_amount", getValidationRules("goal_amount", false))}
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
                {...register("start_date", getValidationRules("start_date", false))}
              />
              {errors.start_date && <span className="text-danger">{errors.start_date.message}</span>}
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control 
                type="date"
                {...register("end_date", getValidationRules("end_date", false))}
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
            rules={getValidationRules("description", false)}
            render={({ field }) => <ReactQuill {...field} />}
          />
          {errors.description && <span className="text-danger">{errors.description.message}</span>}
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Risks and Challenges</Form.Label>
          <Controller
            name="risk_and_challenges"
            control={control}
            rules={getValidationRules("risk_and_challenges", false)}
            render={({ field }) => <ReactQuill {...field} />}
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

        <div className="button-group mt-4 spinner-container">
        <Button
            variant="secondary"
            className="me-2"
            disabled={isSubmitting}
            onClick={handleSubmit(handleSaveAsDraft)}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving Draft...
              </>
            ) : (
              'Save as Draft'
            )}
          </Button>
          
          <Button
            variant="info"
            className="me-2"
            disabled={isSubmitting}
            onClick={handlePreview}
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
                <Spinner size="sm" className="me-2" />
                Creating Project
              </>
            ) : (
              'Create Project'
            )}
          </Button>
      </div>
      </Form>

      {/* Updated Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{getValues('title')}</Modal.Title>
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