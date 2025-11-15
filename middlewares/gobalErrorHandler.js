const serverError = (err, res) => { 
   res.status(err.statusCode).json({
      status: false,
      message : err.message,
      error : err.status
   });
}

const devError = (err, res) => { 
   res.status(err.statusCode).json({
      status: false,
      message : err.message,
      error : err,
      error_stack : err.stack,
      error_status : err.status
   });
}

// Handle MongoDB duplicate key errors
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyPattern || {})[0];
  const value = err.keyValue ? err.keyValue[field] : 'unknown';
  
  let message = `The ${field} '${value}' is already in use. Please choose a different value.`;
  
  if (field === 'email') {
    message = `Email address '${value}' is already in use. Please use a different email address.`;
  } else if (field === 'subdomain') {
    message = `Subdomain '${value}' is already taken. Please choose a different subdomain.`;
  } else if (field === 'name') {
    message = `Company name '${value}' already exists. Please choose a different name.`;
  }
  
  const AppError = require('../utils/AppError');
  return new AppError(message, 409);
};

// Handle MongoDB validation errors
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map(error => error.message);
  const AppError = require('../utils/AppError');
  return new AppError(`Validation failed: ${messages.join(', ')}`, 400);
};

module.exports = (err, req, res, next)=>{
   // Transform MongoDB errors into AppErrors
   if (err.code === 11000) {
     err = handleDuplicateKeyError(err);
   } else if (err.name === 'ValidationError') {
     err = handleValidationError(err);
   }
   
   err.statusCode = err.statusCode || 500;
   err.status = err.status || 'error';

   if(process.env.NODE_ENV === 'development'){
      devError(err, res);
   } else if (process.env.NODE_ENV === 'production') {
      serverError(err, res);
   }
};
